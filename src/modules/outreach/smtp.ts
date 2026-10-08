import "server-only";
import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { HostBlockedError, resolvePublicHost } from "./hosts";

export type SmtpConfig = { host: string; port: number; secure: boolean; user: string; pass: string };

/** Doğrulanan IP'ye bağlanır, TLS sertifikasını ise sunucu adına karşı denetler. */
async function transport(cfg: SmtpConfig) {
  const ip = await resolvePublicHost(cfg.host);
  return nodemailer.createTransport({
    host: ip,
    port: cfg.port,
    secure: cfg.secure,
    requireTLS: !cfg.secure && cfg.port === 587,
    auth: { user: cfg.user, pass: cfg.pass },
    tls: { servername: cfg.host },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 25_000,
  });
}

/** Nodemailer hatalarını kullanıcıya anlaşılır Türkçe mesajlara çevirir. */
export function friendlySmtpError(e: unknown, provider?: string): string {
  if (e instanceof HostBlockedError) return e.message;
  if ((e as { name?: string })?.name === "GmailApiError") return (e as Error).message;
  const err = e as { code?: string; responseCode?: number; message?: string };
  if (err.code === "EAUTH" || err.responseCode === 535 || err.responseCode === 534) {
    return provider === "gmail"
      ? "Google giriş bilgilerini kabul etmedi. Hesap şifrenizi değil, 16 haneli “uygulama şifresini” kullanın (2 adımlı doğrulama açık olmalı)."
      : "Kullanıcı adı ya da şifre kabul edilmedi. Uygulama şifresi gerekiyorsa onu kullanın.";
  }
  if (err.code === "ETIMEDOUT" || err.code === "ESOCKET" || err.code === "ECONNECTION" || err.code === "ECONNREFUSED") return "SMTP sunucusuna bağlanılamadı. Sunucu adı ve portu kontrol edin.";
  if (err.code === "ETLS" || /certificate|self.signed|altname/i.test(err.message ?? "")) return "SMTP sunucusunun güvenlik sertifikası doğrulanamadı.";
  return "SMTP bağlantısı kurulamadı. Ayarları kontrol edip tekrar deneyin.";
}

/** Bağlantıyı ve giriş bilgilerini sınar (e-posta göndermez). */
export async function verifySmtp(cfg: SmtpConfig): Promise<void> {
  const t = await transport(cfg);
  try {
    await t.verify();
  } finally {
    t.close();
  }
}

export type OutgoingMail = Pick<Mail.Options, "from" | "to" | "subject" | "text" | "html" | "headers" | "messageId" | "inReplyTo" | "references" | "replyTo" | "cc" | "bcc">;

/** Tek bir e-posta gönderir; RFC Message-ID'yi döndürür. */
export async function sendMail(cfg: SmtpConfig, mail: OutgoingMail): Promise<{ messageId: string }> {
  const t = await transport(cfg);
  try {
    const info = await t.sendMail(mail);
    return { messageId: info.messageId };
  } finally {
    t.close();
  }
}
