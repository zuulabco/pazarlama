import { NextResponse, type NextRequest } from "next/server";
import { checkDomain } from "@/modules/outreach/dns-lookup";
import { fail, guard, outreachFailure, rateLimiter } from "@/modules/outreach/http";
import { friendlyImapError, verifyImap } from "@/modules/outreach/imap";
import { mailboxInputSchema } from "@/modules/outreach/mailbox-schema";
import { createMailbox, listMailboxes } from "@/modules/outreach/mailboxes";
import { friendlySmtpError, verifySmtp } from "@/modules/outreach/smtp";

export const maxDuration = 60;

const tooFast = rateLimiter(8);

export async function GET(req: NextRequest) {
  const g = await guard(req);
  if ("response" in g) return g.response;
  try {
    return NextResponse.json({ mailboxes: await listMailboxes(g.user.uid) });
  } catch (e) {
    return outreachFailure(e);
  }
}

/**
 * Posta kutusu bağlar. Kaydetmeden önce SMTP (gönderme) ve IMAP (okuma) girişi sınanır; ikisi de çalışmazsa kaydedilmez.
 * Şifre şifrelenerek saklanır ve bir daha istemciye gönderilmez.
 */
export async function POST(req: NextRequest) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  if (tooFast(g.user.uid)) return fail("Çok fazla deneme yaptınız. Bir dakika bekleyip tekrar deneyin.", 429);

  const body = mailboxInputSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);
  const input = body.data;
  const user = input.username ?? input.email;

  try {
    const [smtp, imap] = await Promise.allSettled([
      verifySmtp({ ...input.smtp, user, pass: input.password }),
      verifyImap({ ...input.imap, user, pass: input.password }),
    ]);
    if (smtp.status === "rejected") return fail(`Gönderme (SMTP): ${friendlySmtpError(smtp.reason, input.provider)}`, 422);
    if (imap.status === "rejected") return fail(`Okuma (IMAP): ${friendlyImapError(imap.reason, input.provider)}`, 422);
    const imapState = imap.value;

    const dns = await checkDomain(input.email.slice(input.email.lastIndexOf("@") + 1), input.provider).catch(() => null);
    return NextResponse.json({ mailbox: await createMailbox(g.user.uid, input, dns, imapState) }, { status: 201 });
  } catch (e) {
    return outreachFailure(e);
  }
}
