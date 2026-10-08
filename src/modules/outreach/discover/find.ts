import "server-only";
import { normalizeSiteUrl } from "@/lib/url";
import { extractPage } from "@/modules/profile/site/extract";
import { fetchPublicHtml, UnreachableSiteError } from "@/modules/profile/site/safe-fetch";
import { emailDomain, extractEmails, pickContactLinks, rankCandidates, type Candidate } from "./emails";
import { checkMailDns } from "./verify";
import { isDisposable, statusFor, type EmailStatus, type MailDns } from "./verify-rules";

export type CheckedCandidate = Candidate & { dns: MailDns; status: EmailStatus };

export type Discovery =
  | { ok: true; candidates: CheckedCandidate[]; best: CheckedCandidate | null; pages: number }
  | { ok: false; error: string };

/** Ana sayfa yoksa denenen yaygın iletişim yolları. */
const FALLBACK_PATHS = ["/iletisim", "/contact"];

/**
 * Bir firmanın web sitesinden (ana sayfa + iletişim/hakkında sayfaları) e-posta adreslerini bulur ve ücretsiz kurallarla
 * denetler. Yalnızca HTTP ve DNS kullanır (ek maliyet yok). Sitede açıkça yazılmayan adres tahmin edilmez.
 */
export async function discoverEmails(websiteRaw: string): Promise<Discovery> {
  const start = normalizeSiteUrl(websiteRaw);
  if (!start) return { ok: false, error: "Geçerli bir web sitesi adresi yok." };

  // Apex alan adı açılmıyorsa "www." ile (ya da tersi) denenir: Türkiye'deki birçok site yalnızca birinde yayında.
  const flip = (url: string) => {
    const u = new URL(url);
    u.hostname = u.hostname.startsWith("www.") ? u.hostname.slice(4) : `www.${u.hostname}`;
    return u.toString();
  };
  let home: { url: string; html: string } | null = null;
  for (const candidate of [start, flip(start)]) {
    try {
      home = await fetchPublicHtml(candidate);
      break;
    } catch (e) {
      if (!(e instanceof UnreachableSiteError)) throw e;
    }
  }
  if (!home) return { ok: false, error: "Siteye ulaşılamadı." };

  const homeInfo = extractPage(home.html);
  let targets = pickContactLinks(homeInfo.links, home.url, 3);
  if (targets.length === 0) targets = FALLBACK_PATHS.map((p) => new URL(p, home.url).toString());

  const settled = await Promise.allSettled(targets.map((u) => fetchPublicHtml(u)));
  const pages = [{ url: home.url, html: home.html }, ...settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []))];

  const found = pages.flatMap((p) => extractEmails(p.html).map((f) => ({ ...f, sourceUrl: p.url })));
  const ranked = rankCandidates(found, new URL(home.url).hostname).slice(0, 6);

  const candidates: CheckedCandidate[] = await Promise.all(
    ranked.map(async (c) => {
      const dns = await checkMailDns(emailDomain(c.email));
      return { ...c, dns, status: statusFor({ dns, disposable: isDisposable(emailDomain(c.email)), origin: "site" }) };
    }),
  );

  // En iyi aday: geçersiz olmayan en yüksek puanlı adres (liste zaten puana göre sıralı).
  const best = candidates.find((c) => c.status !== "gecersiz") ?? null;
  return { ok: true, candidates, best, pages: pages.length };
}
