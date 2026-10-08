import "server-only";
import { sendViaGmail } from "./gmail";
import type { Provider } from "./presets";
import { sendMail, type OutgoingMail } from "./smtp";

/** Posta kutusunun bağlantı türüne göre gönderir: Google OAuth → Gmail API, diğerleri → SMTP. `secret` şifre ya da yenileme jetonudur. */
export function deliver(box: { provider: Provider; smtp: { host: string; port: number; secure: boolean }; username: string }, secret: string, mail: OutgoingMail): Promise<{ messageId: string }> {
  if (box.provider === "google") return sendViaGmail(secret, mail);
  return sendMail({ ...box.smtp, user: box.username, pass: secret }, mail);
}
