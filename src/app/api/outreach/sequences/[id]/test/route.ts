import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { signToken } from "@/modules/outreach/crypto";
import { fail, guard, outreachFailure, rateLimiter } from "@/modules/outreach/http";
import { getMailboxCredentials, listMailboxes } from "@/modules/outreach/mailboxes";
import { buildOutgoing, newMessageId } from "@/modules/outreach/mime";
import { renderTemplate, sampleVars } from "@/modules/outreach/render";
import { getSequence } from "@/modules/outreach/sequences";
import { deliver } from "@/modules/outreach/mailer";
import { friendlySmtpError } from "@/modules/outreach/smtp";
import { site } from "@/lib/site";

export const maxDuration = 60;

const tooFast = rateLimiter(6);
const bodySchema = z.object({
  subject: z.string().max(150),
  body: z.string().min(1, "Mesaj boş.").max(5000),
  /** Test e-postasının gideceği adres; boşsa seçilen posta kutusunun kendi adresi. */
  to: z.string().trim().toLowerCase().regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Geçerli bir e-posta adresi yazın.").optional(),
  mailboxId: z.uuid().optional(),
});

/**
 * "Bana test e-postası gönder": adımın metnini örnek verilerle (Ayşe, Lale Diş Kliniği…) doldurup kampanyanın posta kutusundan
 * gönderir; gerçek e-postayla aynı imza ve abonelik alt bilgisini taşır. Kampanya kayıtlarına dokunmaz.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/outreach/sequences/[id]/test">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  if (tooFast(g.user.uid)) return fail("Çok fazla test e-postası gönderdiniz. Biraz bekleyin.", 429);
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Kampanya bulunamadı.", 404);
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);

  try {
    const seq = await getSequence(g.user.uid, id);
    if (!seq) return fail("Kampanya bulunamadı.", 404);
    const boxes = (await listMailboxes(g.user.uid)).filter((m) => m.status === "bagli" && (seq.settings.mailboxIds.length === 0 || seq.settings.mailboxIds.includes(m.id)));
    const chosen = boxes.find((m) => m.id === body.data.mailboxId) ?? boxes[0];
    if (!chosen) return fail("Test için bağlı bir posta kutusu yok. Posta kutuları sayfasından bağlayın.", 409);
    const creds = await getMailboxCredentials(g.user.uid, chosen.id);
    if (!creds) return fail("Posta kutusu bulunamadı.", 404);

    const vars = { ...sampleVars, sender_name: chosen.fromName ?? sampleVars.sender_name };
    const token = signToken(`e:00000000-0000-0000-0000-000000000000`); // örnek: gerçek bir kişiye bağlı değil, tıklanınca "geçersiz" der
    const mail = buildOutgoing({
      fromName: chosen.fromName,
      fromEmail: chosen.email,
      to: body.data.to ?? chosen.email,
      subject: `[TEST] ${renderTemplate(body.data.subject, vars) || "(konu yok)"}`,
      body: renderTemplate(body.data.body, vars),
      signature: chosen.signature,
      includeSignature: seq.settings.includeSignature,
      identity: [chosen.fromName, seq.settings.footerAddress].filter(Boolean).join(" · "),
      unsubscribeUrl: `${site.url}/u/${token}`,
      oneClickUrl: `${site.url}/api/outreach/unsub/${token}`,
      messageId: newMessageId(chosen.email.slice(chosen.email.lastIndexOf("@") + 1)),
    });
    try {
      await deliver(chosen, creds.password, mail);
    } catch (e) {
      return fail(friendlySmtpError(e, chosen.provider), 422);
    }
    return NextResponse.json({ ok: true, to: body.data.to ?? chosen.email });
  } catch (e) {
    return outreachFailure(e);
  }
}
