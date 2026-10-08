import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, guard, outreachFailure, rateLimiter } from "@/modules/outreach/http";
import { friendlyImapError, verifyImap } from "@/modules/outreach/imap";
import { mailboxPatchSchema } from "@/modules/outreach/mailbox-schema";
import { deleteMailbox, getMailboxCredentials, updateMailbox } from "@/modules/outreach/mailboxes";
import { friendlySmtpError, verifySmtp } from "@/modules/outreach/smtp";

export const maxDuration = 60;

const tooFast = rateLimiter(10);

/** Ad, imza, günlük/saatlik limit, duraklat/sürdür; şifre verilirse bağlantı yeniden sınanır. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/outreach/mailboxes/[id]">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  if (tooFast(g.user.uid)) return fail("Çok hızlı istek gönderiyorsunuz. Biraz bekleyin.", 429);

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Gönderici adresi bulunamadı.", 404);
  const body = mailboxPatchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);

  try {
    const patch: Parameters<typeof updateMailbox>[2] = { ...body.data };
    if (body.data.password) {
      const current = await getMailboxCredentials(g.user.uid, id);
      if (!current) return fail("Gönderici adresi bulunamadı.", 404);
      const { mailbox } = current;
      const user = mailbox.username;
      const [smtp, imap] = await Promise.allSettled([
        verifySmtp({ ...mailbox.smtp, user, pass: body.data.password }),
        verifyImap({ ...mailbox.imap, user, pass: body.data.password }),
      ]);
      if (smtp.status === "rejected") return fail(`Gönderme (SMTP): ${friendlySmtpError(smtp.reason, mailbox.provider)}`, 422);
      if (imap.status === "rejected") return fail(`Okuma (IMAP): ${friendlyImapError(imap.reason, mailbox.provider)}`, 422);
      patch.status = "bagli";
      patch.lastError = null;
    }
    const mailbox = await updateMailbox(g.user.uid, id, patch);
    return mailbox ? NextResponse.json({ mailbox }) : fail("Gönderici adresi bulunamadı.", 404);
  } catch (e) {
    return outreachFailure(e);
  }
}

/** Gönderici adresini bağlantıdan çıkarır (şifre silinir; e-posta hesabınıza dokunulmaz). */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/outreach/mailboxes/[id]">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Gönderici adresi bulunamadı.", 404);
  try {
    await deleteMailbox(g.user.uid, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return outreachFailure(e);
  }
}
