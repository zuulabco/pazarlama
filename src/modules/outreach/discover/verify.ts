import "server-only";
import dns from "node:dns/promises";
import type { MailDns } from "./verify-rules";

const TTL_MS = 60 * 60_000;
const cache = new Map<string, { value: MailDns; at: number }>();

const withTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

/**
 * Alan adının e-posta alıp alamadığını DNS ile bakar: MX kaydı varsa "mx"; yoksa A/AAAA kaydı (RFC'ye göre
 * örtük MX) varsa "a"; alan adı hiç yoksa "none"; ağ hatası ya da zaman aşımında "unknown".
 */
export async function checkMailDns(domain: string): Promise<MailDns> {
  const key = domain.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  let value: MailDns;
  try {
    const mx = await withTimeout(dns.resolveMx(key), 4000);
    value = mx.some((r) => r.exchange && r.exchange !== ".") ? "mx" : "none"; // "." = bu alan adı e-posta kabul etmez (null MX)
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENODATA" || code === "ENOTFOUND" || code === "ENODOMAIN" || code === "NXDOMAIN") {
      try {
        const a = await withTimeout(dns.resolve4(key), 4000);
        value = a.length > 0 ? "a" : "none";
      } catch (e2) {
        const c2 = (e2 as NodeJS.ErrnoException).code;
        value = c2 === "ENODATA" || c2 === "ENOTFOUND" || c2 === "ENODOMAIN" || c2 === "NXDOMAIN" ? "none" : "unknown";
      }
    } else {
      value = "unknown";
    }
  }
  if (value !== "unknown") cache.set(key, { value, at: Date.now() });
  if (cache.size > 2000) cache.clear();
  return value;
}
