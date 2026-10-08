import "server-only";
import { ImapFlow } from "imapflow";
import { HostBlockedError, resolvePublicHost } from "./hosts";

export type ImapConfig = { host: string; port: number; secure: boolean; user: string; pass: string };

export function friendlyImapError(e: unknown, provider?: string): string {
  if (e instanceof HostBlockedError) return e.message;
  const err = e as { code?: string; authenticationFailed?: boolean; responseText?: string; message?: string };
  if (err.authenticationFailed || /auth|login|credentials|invalid/i.test(err.responseText ?? err.message ?? "")) {
    return provider === "gmail"
      ? "Google IMAP girişini kabul etmedi. Uygulama şifresini kontrol edin ve Gmail ayarlarında IMAP'in açık olduğundan emin olun (Workspace'te yönetici izni gerekebilir)."
      : "IMAP kullanıcı adı ya da şifresi kabul edilmedi.";
  }
  if (err.code === "ETIMEDOUT" || err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.code === "EAI_AGAIN") return "IMAP sunucusuna bağlanılamadı. Sunucu adı ve portu kontrol edin.";
  return "IMAP bağlantısı kurulamadı. Ayarları kontrol edip tekrar deneyin.";
}

/**
 * Bir IMAP oturumu açar, `fn`'i çalıştırır, oturumu kapatır. Sunucusuz ortamda kalıcı bağlantı tutulmaz;
 * her çağrı bağlan-oku-kapat şeklindedir. Bağlantı doğrulanan IP'ye yapılır, TLS sunucu adına karşı denetlenir.
 */
export async function withImap<T>(cfg: ImapConfig, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const ip = await resolvePublicHost(cfg.host);
  const client = new ImapFlow({
    host: ip,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    tls: { servername: cfg.host },
    logger: false,
    socketTimeout: 25_000,
    greetingTimeout: 10_000,
    connectionTimeout: 10_000,
  });
  client.on("error", () => undefined); // bağlantı kopması ana akışta yakalanır
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.logout().catch(() => client.close());
  }
}

export type ImapState = { uidValidity: number; uidNext: number };

/** Bağlantıyı ve giriş bilgilerini sınar; gelen kutusunun şu anki durumunu (okunmuş sayılacak sınır) döndürür. */
export async function verifyImap(cfg: ImapConfig): Promise<ImapState> {
  return withImap(cfg, async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const mb = client.mailbox;
      if (!mb) throw new Error("Gelen kutusu açılamadı.");
      return { uidValidity: Number(mb.uidValidity), uidNext: mb.uidNext };
    } finally {
      lock.release();
    }
  });
}
