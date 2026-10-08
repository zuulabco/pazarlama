import { fold } from "@/lib/text";

/** Bir web sayfasından, firmayı anlamaya yarayan metin ve bağlantı bilgilerini çıkarır. Saf fonksiyonlar. */

export type PageInfo = {
  title: string;
  description: string;
  siteName: string;
  headings: string[];
  text: string;
  /** JSON-LD (schema.org) içindeki firma bilgileri: ad, tür, adres, telefon. */
  structured: string;
  links: { href: string; text: string }[];
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[\da-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : " ";
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const squash = (text: string) => decodeEntities(text).replace(/\s+/g, " ").trim();
const stripTags = (html: string) => squash(html.replace(/<[^>]*>/g, " "));

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    out[m[1].toLowerCase()] ??= m[2] ?? m[3] ?? m[4] ?? "";
  }
  return out;
}

function metas(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const a = attrs(tag);
    const key = (a.property ?? a.name ?? "").toLowerCase();
    if (key && a.content) out[key] ??= squash(a.content);
  }
  return out;
}

type Json = Record<string, unknown>;
const asText = (v: unknown) => (typeof v === "string" ? squash(v) : "");

function structuredData(html: string): string {
  const found: string[] = [];
  for (const m of html.matchAll(/<script\b[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1]);
    } catch {
      continue;
    }
    const stack: unknown[] = [data];
    while (stack.length && found.length < 4) {
      const node = stack.pop();
      if (Array.isArray(node)) stack.push(...node);
      else if (node && typeof node === "object") {
        const o = node as Json;
        if (o["@graph"]) stack.push(o["@graph"]);
        const type = Array.isArray(o["@type"]) ? o["@type"].join("/") : asText(o["@type"]);
        if (type && /organization|business|store|service|firm|clinic|agency|office|company|professional/i.test(type)) {
          const addr = (o.address ?? {}) as Json;
          const parts = [
            `tür: ${type}`,
            asText(o.name) && `ad: ${asText(o.name)}`,
            asText(o.description) && `açıklama: ${asText(o.description).slice(0, 300)}`,
            [asText(addr.addressLocality), asText(addr.addressRegion)].filter(Boolean).join(", ") && `adres: ${[asText(addr.addressLocality), asText(addr.addressRegion)].filter(Boolean).join(", ")}`,
            asText(o.telephone) && "telefon var",
          ].filter(Boolean);
          found.push(parts.join("; "));
        }
      }
    }
  }
  return found.join("\n");
}

export function extractPage(html: string): PageInfo {
  const structured = structuredData(html);
  const m = metas(html);
  const links: PageInfo["links"] = [];
  for (const a of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = attrs(a[1]).href;
    if (href) links.push({ href: decodeEntities(href.trim()), text: stripTags(a[2]).slice(0, 80) });
    if (links.length >= 200) break;
  }

  const body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe|head)\b[\s\S]*?<\/\1>/gi, " ");
  const headings = [...body.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((h) => stripTags(h[1]))
    .filter((h) => h.length > 1 && h.length < 140)
    .slice(0, 14);

  return {
    title: squash(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? m["og:title"] ?? ""),
    description: m.description ?? m["og:description"] ?? "",
    siteName: m["og:site_name"] ?? m["application-name"] ?? "",
    headings,
    text: stripTags(body.replace(/<(nav|footer)\b[\s\S]*?<\/\1>/gi, " ")).slice(0, 5000),
    structured,
    links,
  };
}

/** Sayfadaki bağlantılardan, firmayı anlatan (hakkında, hizmetler…) aynı siteden en çok `max` sayfa seçer. */
export function pickRelatedLinks(links: PageInfo["links"], base: string, max = 2): string[] {
  const root = new URL(base);
  const host = root.hostname.replace(/^www\./, "");
  const score = (path: string, label: string) => {
    const text = fold(`${path} ${label}`);
    if (/hakkimizda|hakkinda|about|kurumsal|biz kimiz/.test(text)) return 3;
    if (/hizmet|services|cozum|urunler|faaliyet|uzmanlik/.test(text)) return 2;
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
    if (url.pathname === "/" || url.pathname === root.pathname || /\.(pdf|jpe?g|png|webp|zip)$/i.test(url.pathname)) continue;
    const s = score(url.pathname, l.text);
    url.hash = "";
    url.search = "";
    if (s > 0 && s > (picked.get(url.toString()) ?? 0)) picked.set(url.toString(), s);
  }
  return [...picked.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([u]) => u);
}

/** Sitenin bağlantılarından, müşteriyle iletişimde kullanılan kanalları (profildeki kanal kodlarıyla) bulur. */
export function detectChannels(links: PageInfo["links"]): string[] {
  const found = new Set<string>();
  for (const { href } of links) {
    const h = href.toLowerCase();
    if (h.startsWith("tel:")) found.add("telefon");
    else if (h.startsWith("mailto:")) found.add("eposta");
    else if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|wa\.link)\b/.test(h)) found.add("whatsapp");
    else if (/^https?:\/\/([a-z]+\.)?instagram\.com\/[^/?#]+/.test(h)) found.add("instagram");
    else if (/^https?:\/\/([a-z]+\.)?linkedin\.com\/(company|in)\//.test(h)) found.add("linkedin");
  }
  return [...found];
}
