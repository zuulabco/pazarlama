import { fold } from "@/lib/text";

/**
 * Bir web sayfasından e-posta adresi çıkarma ve sınıflama. Saf fonksiyonlar (ağ yok).
 * Yalnızca sayfada AÇIKÇA yazılmış adresler alınır; tahmin yürütülmez.
 */

export type EmailKind = "is" | "rol" | "kisisel";
export type EmailFound = { email: string; via: "mailto" | "metin" | "gizli" | "veri" };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decodeEntities = (text: string) =>
  text.replace(/&(#x?[\da-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : " ";
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });

/** Cloudflare e-posta gizleme (`data-cfemail`): ilk bayt anahtardır, kalanı XOR ile çözülür. */
export function decodeCfEmail(hex: string): string | null {
  if (!/^[\da-f]{4,}$/i.test(hex) || hex.length % 2 !== 0) return null;
  const key = parseInt(hex.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  return out;
}

const EMAIL = /[a-z0-9][a-z0-9._%+-]{0,63}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,24}/gi;

/** Görsel/varlık dosyası gibi görünen sahte eşleşmeler ("logo@2x.png") ve yer tutucu alan adları. */
const ASSET_TLD = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "css", "js", "ico", "woff", "woff2", "ttf", "map", "pdf", "mp4"]);
const PLACEHOLDER_DOMAINS = new Set([
  "example.com", "example.org", "domain.com", "email.com", "yourdomain.com", "yoursite.com", "site.com", "sentry.io", "wixpress.com",
  "sentry-next.wixpress.com", "godaddy.com", "squarespace.com", "mysite.com", "company.com", "test.com", "ornek.com", "alanadi.com",
]);
const PLACEHOLDER_LOCALS = new Set(["user", "name", "email", "mail", "your", "yourname", "isim", "ad", "adiniz", "example", "test", "ornek", "john", "johndoe"]);
const NOREPLY = /^(no-?reply|do-?not-?reply|donotreply|mailer-daemon|postmaster|abuse|bounce|bounces|unsubscribe)$/i;

/** Adresi küçük harfe çevirir, sondaki noktalama ve boşlukları atar. */
export function cleanEmail(raw: string): string {
  return raw.trim().replace(/^mailto:/i, "").replace(/[?#].*$/, "").replace(/[.,;:)>\]}"'’]+$/, "").toLowerCase();
}

export function isPlausibleEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 1 || email.length > 254) return false;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const tld = domain.slice(domain.lastIndexOf(".") + 1);
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) || tld.length < 2) return false;
  if (ASSET_TLD.has(tld) || PLACEHOLDER_DOMAINS.has(domain) || PLACEHOLDER_LOCALS.has(local)) return false;
  if (NOREPLY.test(local) || /\.\./.test(email) || /^[.-]|[.-]$/.test(local)) return false;
  // "foo@2x.png" gibi ya da uzun onaltılık dizili (izleme kimliği) yerel kısımlar
  if (/^[\da-f]{24,}$/.test(local) || /@\d+x\./.test(email)) return false;
  return true;
}

/** "ad [at] firma [dot] com", "ad(at)firma.com" gibi gizlenmiş adresleri açar. */
function deobfuscate(text: string): string {
  return text
    .replace(/\s*[[({]\s*(?:at|@)\s*[\])}]\s*/gi, "@")
    .replace(/\s*[[({]\s*(?:dot|nokta|\.)\s*[\])}]\s*/gi, ".");
}

/** HTML ya da düz metinden adresleri çıkarır. Sıra: mailto (en güvenilir) → gizli → veri → metin. */
export function extractEmails(html: string): EmailFound[] {
  const found = new Map<string, EmailFound>();
  const add = (raw: string, via: EmailFound["via"]) => {
    for (const m of raw.match(EMAIL) ?? []) {
      const email = cleanEmail(m);
      if (isPlausibleEmail(email) && !found.has(email)) found.set(email, { email, via });
    }
  };

  // 1) mailto: bağlantıları
  for (const m of html.matchAll(/href\s*=\s*["']?\s*mailto:([^"'\s>]+)/gi)) {
    add(decodeURIComponent(decodeEntities(m[1]).replace(/%(?![\da-f]{2})/gi, "%25")).split(",")[0] ?? "", "mailto");
  }
  // 2) Cloudflare gizleme
  for (const m of html.matchAll(/data-cfemail\s*=\s*["']([\da-f]+)["']/gi)) {
    const decoded = decodeCfEmail(m[1]);
    if (decoded) add(decoded, "gizli");
  }
  // 3) Yapısal veri (JSON-LD "email")
  for (const m of html.matchAll(/"email"\s*:\s*"([^"]+)"/gi)) add(decodeEntities(m[1]), "veri");
  // 4) Görünen metin (betik/stil/yorum atılır), gizlenmiş yazımlar açılır
  const text = decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  );
  add(deobfuscate(text), "metin");
  return [...found.values()];
}

const ROLE_LOCALS = new Set([
  "info", "bilgi", "iletisim", "contact", "hello", "merhaba", "destek", "support", "satis", "sales", "admin", "randevu", "rezervasyon", "reservation",
  "office", "ofis", "muhasebe", "hr", "ik", "kariyer", "career", "careers", "mail", "webmaster", "siparis", "order", "orders", "teklif",
  "pazarlama", "marketing", "genel", "yonetim", "sekreter", "santral", "musteri", "musterihizmetleri", "customer", "service", "enquiry", "enquiries",
]);

const PERSONAL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.com.tr", "outlook.com", "outlook.com.tr", "live.com", "msn.com", "yahoo.com", "yahoo.com.tr",
  "yandex.com", "yandex.com.tr", "yandex.ru", "icloud.com", "me.com", "mynet.com", "gmx.com", "gmx.net", "proton.me", "protonmail.com", "aol.com",
  "windowslive.com", "ymail.com", "mail.com", "tutanota.com", "hotmail.es", "hotmail.de",
]);

export const emailDomain = (email: string) => email.slice(email.lastIndexOf("@") + 1);

export function classifyEmail(email: string): EmailKind {
  const local = fold(email.slice(0, email.lastIndexOf("@"))).replace(/[._-]/g, "");
  if (PERSONAL_DOMAINS.has(emailDomain(email))) return "kisisel";
  return ROLE_LOCALS.has(local) ? "rol" : "is";
}

/** Adres, sitenin kendi alan adındaysa true ("info@firma.com" ↔ "www.firma.com"). */
export function sameSite(email: string, siteHost: string): boolean {
  const root = (h: string) => h.toLowerCase().replace(/^www\./, "");
  const a = root(emailDomain(email));
  const b = root(siteHost);
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

export type Candidate = EmailFound & { kind: EmailKind; sameSite: boolean; score: number; sourceUrl: string };

/**
 * Adayları sıralar: sitenin kendi alan adındaki adres > kişiye ait iş adresi > rol adresi > kişisel adres;
 * mailto bağlantısı, düz metinden daha güvenilirdir.
 */
export function rankCandidates(found: { email: string; via: EmailFound["via"]; sourceUrl: string }[], siteHost: string): Candidate[] {
  const seen = new Map<string, Candidate>();
  for (const f of found) {
    const kind = classifyEmail(f.email);
    const same = sameSite(f.email, siteHost);
    const score = (same ? 4 : 0) + (kind === "is" ? 2 : kind === "rol" ? 1 : 0) + (f.via === "mailto" || f.via === "veri" ? 1 : 0);
    const prev = seen.get(f.email);
    if (!prev || prev.score < score) seen.set(f.email, { ...f, kind, sameSite: same, score });
  }
  return [...seen.values()].sort((a, b) => b.score - a.score || a.email.localeCompare(b.email));
}

/** Aynı siteden iletişim bilgisi barındırması muhtemel sayfalar (en çok `max`). */
export function pickContactLinks(links: { href: string; text: string }[], base: string, max = 3): string[] {
  const root = new URL(base);
  const host = root.hostname.replace(/^www\./, "");
  const score = (path: string, label: string) => {
    const t = fold(`${path} ${label}`);
    if (/iletisim|contact|bize-?ulas|ulasim/.test(t)) return 3;
    if (/hakkimizda|about|kurumsal|ekibimiz|team|randevu|appointment|rezervasyon/.test(t)) return 2;
    return 0;
  };
  const picked = new Map<string, number>();
  for (const l of links) {
    let url: URL;
    try {
      url = new URL(l.href, root);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol) || url.hostname.replace(/^www\./, "") !== host) continue;
    if (url.pathname === "/" || url.pathname === root.pathname || /\.(pdf|jpe?g|png|webp|zip|docx?)$/i.test(url.pathname)) continue;
    const s = score(url.pathname, l.text);
    url.hash = "";
    url.search = "";
    if (s > 0 && s > (picked.get(url.toString()) ?? 0)) picked.set(url.toString(), s);
  }
  return [...picked.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([u]) => u);
}
