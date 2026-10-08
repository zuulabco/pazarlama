import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, guard, outreachFailure, rateLimiter } from "@/modules/outreach/http";
import { getMailboxCredentials, updateMailbox } from "@/modules/outreach/mailboxes";
import { friendlySmtpError, sendMail } from "@/modules/outreach/smtp";

export const maxDuration = 60;

const tooFast = rateLimiter(6);

/** Posta kutusunun kendi adresine bir test e-postası gönderir (göndermenin çalıştığını ve hangi adrese gittiğini gösterir). */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/outreach/mailboxes/[id]/test">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  if (tooFast(g.user.uid)) return fail("Çok fazla test e-postası gönderdiniz. Biraz bekleyin.", 429);

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Posta kutusu bulunamadı.", 404);

  try {
    const creds = await getMailboxCredentials(g.user.uid, id);
    if (!creds) return fail("Posta kutusu bulunamadı.", 404);
    const { mailbox, password } = creds;

    try {
      const sent = await sendMail(
        { ...mailbox.smtp, user: mailbox.username, pass: password },
        {
          from: mailbox.fromName ? { name: mailbox.fromName, address: mailbox.email } : mailbox.email,
          to: mailbox.email,
          subject: "Adspine test e-postası",
          text: `Merhaba,\n\nBu e-posta, ${mailbox.email} posta kutusunun Adspine'dan gönderim yapabildiğini doğrulamak için gönderildi.\n\nBir işlem yapmanız gerekmiyor.\n\n${mailbox.signature}`.trimEnd() + "\n",
        },
      );
      if (mailbox.status === "hata") await updateMailbox(g.user.uid, id, { status: "bagli", lastError: null });
      return NextResponse.json({ ok: true, to: mailbox.email, messageId: sent.messageId });
    } catch (e) {
      const message = friendlySmtpError(e, mailbox.provider);
      await updateMailbox(g.user.uid, id, { status: "hata", lastError: message.slice(0, 300) });
      return fail(message, 422);
    }
  } catch (e) {
    return outreachFailure(e);
  }
}
