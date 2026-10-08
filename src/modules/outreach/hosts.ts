import "server-only";
import dns from "node:dns/promises";
import { isIP } from "node:net";
import { isPrivateIp } from "@/modules/profile/site/ip";

/**
 * Kullanıcının girdiği SMTP/IMAP sunucularına bağlanmadan önce (SSRF'e karşı) denetim: yalnızca genel internet
 * adresleri, yalnızca bilinen posta portları. Bağlantı, doğrulanan IP'ye yapılır (DNS rebinding'e karşı).
 */

export const smtpPorts = [465, 587, 25, 2525] as const;
export const imapPorts = [993, 143] as const;

export class HostBlockedError extends Error {}

const HOSTNAME = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/i;

/** Sunucu adı geçerli ve iç ağa işaret etmiyorsa küçük harfe çevrilmiş hâlini, değilse null döndürür. */
export function normalizeHost(raw: string): string | null {
  const host = raw.trim().toLowerCase();
  if (!HOSTNAME.test(host) || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) return null;
  if (isIP(host) !== 0) return null; // IP yazılmaz; sunucu adı kullanılır
  return host;
}

/** Sunucu adını çözer; yalnızca genel IP'lere çözülüyorsa ilkini döndürür, aksi halde HostBlockedError fırlatır. */
export async function resolvePublicHost(host: string): Promise<string> {
  const name = normalizeHost(host);
  if (!name) throw new HostBlockedError("Geçersiz sunucu adı.");
  let addrs: { address: string }[];
  try {
    addrs = await dns.lookup(name, { all: true });
  } catch {
    throw new HostBlockedError(`${name} adresi bulunamadı. Sunucu adını kontrol edin.`);
  }
  const ok = addrs.filter((a) => !isPrivateIp(a.address));
  if (ok.length === 0) throw new HostBlockedError("Bu sunucuya bağlanılamaz.");
  return ok[0].address;
}
