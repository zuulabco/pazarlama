import { titleCase } from "@/lib/text";

/**
 * E-posta şablonlarında değişken işleme (saf). Söz dizimi: `{{ad}}` ya da yedekli `{{ad|Merhaba}}`.
 * Değer yoksa yedek metin, o da yoksa boş metin yazılır; çıktı noktalama boşluklarından arındırılır.
 */

export type RenderVars = Record<string, string | undefined | null>;

export const variableCatalog = [
  { key: "first_name", label: "Ad", example: "Ayşe" },
  { key: "last_name", label: "Soyad", example: "Demir" },
  { key: "name", label: "Ad soyad", example: "Ayşe Demir" },
  { key: "company", label: "Firma", example: "Lale Diş Kliniği" },
  { key: "city", label: "Şehir", example: "Kadıköy" },
  { key: "website", label: "Web sitesi", example: "lale.com.tr" },
  { key: "sender_first_name", label: "Benim adım", example: "Elif" },
  { key: "sender_name", label: "Adım soyadım", example: "Elif Yıldız" },
  { key: "sender_company", label: "Benim firmam", example: "Yıldız Mali Müşavirlik" },
] as const;

const TOKEN = /\{\{\s*([a-z_][a-z0-9_]*)\s*(?:\|([^}]*))?\}\}/gi;

export function renderTemplate(template: string, vars: RenderVars): string {
  const out = template.replace(TOKEN, (_m, key: string, fallback?: string) => {
    const v = vars[key.toLowerCase()]?.trim();
    return v ? v : (fallback ?? "").trim();
  });
  return tidy(out);
}

/** Boş değişkenlerden kalan boşlukları ve "Merhaba ," gibi bozuk noktalamayı düzeltir. */
export function tidy(text: string): string {
  return text
    .replace(/[ \t]+([,.!?;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Şablondaki değişken adları (tekrarsız). */
export function listVariables(template: string): string[] {
  return [...new Set([...template.matchAll(TOKEN)].map((m) => m[1].toLowerCase()))];
}

/** Değeri olmayan ve yedeği de bulunmayan değişkenler: alıcıya boş giden yerleri uyarmak için. */
export function unfilledVariables(template: string, vars: RenderVars): string[] {
  const bad = new Set<string>();
  for (const m of template.matchAll(TOKEN)) {
    const key = m[1].toLowerCase();
    if (!vars[key]?.trim() && !(m[2] ?? "").trim()) bad.add(key);
  }
  return [...bad];
}

export type ContactLike = { name: string | null; company: string | null; city: string | null; website: string | null };
export type SenderLike = { name: string | null; company: string | null };

const clean = (v: string | null) => v?.trim() || undefined;

/** Kişi ve gönderen bilgilerinden şablon değişkenleri üretir. Ad yoksa `first_name` boş kalır (yedek metin devreye girer). */
export function buildVars(contact: ContactLike, sender: SenderLike): RenderVars {
  const full = clean(contact.name);
  const parts = full?.split(/\s+/) ?? [];
  const senderParts = clean(sender.name)?.split(/\s+/) ?? [];
  return {
    first_name: parts[0] ? titleCase(parts[0]) : undefined,
    last_name: parts.length > 1 ? titleCase(parts.slice(1).join(" ")) : undefined,
    name: full ? titleCase(full) : undefined,
    company: clean(contact.company),
    city: clean(contact.city),
    website: clean(contact.website)?.replace(/^https?:\/\//i, "").replace(/\/$/, ""),
    sender_first_name: senderParts[0] ? titleCase(senderParts[0]) : undefined,
    sender_name: clean(sender.name),
    sender_company: clean(sender.company),
  };
}

/** Örnek kişiyle önizleme için örnek değerler. */
export const sampleVars: RenderVars = Object.fromEntries(variableCatalog.map((v) => [v.key, v.example]));
