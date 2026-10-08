import "server-only";
import dns from "node:dns/promises";
import { analyzeDns, dkimSelectors, type DnsFacts, type DnsReport } from "./dns-health";
import { providerFromMx, type Provider } from "./presets";

const withTimeout = <T>(p: Promise<T>, ms = 4000) => Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> => {
  try {
    return await withTimeout(p);
  } catch {
    return fallback;
  }
};

const txt = async (name: string) => (await safe(dns.resolveTxt(name), [] as string[][])).map((parts) => parts.join(""));

/** Alan adının MX kayıtları (öncelik sırasıyla). */
export async function lookupMx(domain: string): Promise<string[]> {
  const mx = await safe(dns.resolveMx(domain), []);
  return mx.sort((a, b) => a.priority - b.priority).map((m) => m.exchange.toLowerCase());
}

/** MX'ten sağlayıcıyı bulur (özel alan adlı Google Workspace / Microsoft 365). */
export async function detectProvider(domain: string): Promise<Provider | null> {
  return providerFromMx(await lookupMx(domain));
}

/** Alan adının SPF/DKIM/DMARC/MX durumunu denetler ve rapor üretir. */
export async function checkDomain(domain: string, provider: Provider): Promise<DnsReport> {
  const [records, dmarcRecords, mx, dkim] = await Promise.all([
    txt(domain),
    txt(`_dmarc.${domain}`),
    lookupMx(domain),
    Promise.all(
      dkimSelectors[provider].map(async (s) => {
        const name = `${s}._domainkey.${domain}`;
        const [t, c] = await Promise.all([txt(name), safe(dns.resolveCname(name), [] as string[])]);
        return t.some((r) => /v=dkim1|k=rsa|p=/i.test(r)) || c.length > 0 ? s : null;
      }),
    ),
  ]);
  const facts: DnsFacts = {
    spf: records.filter((r) => /^v=spf1/i.test(r)),
    dmarc: dmarcRecords.filter((r) => /^v=dmarc1/i.test(r)),
    dkimFound: dkim.filter((s): s is string => Boolean(s)),
    mx,
  };
  return analyzeDns(domain, provider, facts);
}
