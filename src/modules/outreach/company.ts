import { fold } from "@/lib/text";
import { classifyEmail, emailDomain } from "./discover/emails";

/**
 * "Aynı şirket" tespiti: kişisel olmayan e-posta adresinin alan adı (ayse@firma.com ve ali@firma.com aynı şirkettir).
 * Gmail gibi ortak alan adlarında şirket anlamına gelmediği için null döner.
 */
export function companyDomain(email: string | null | undefined): string | null {
  if (!email || !email.includes("@")) return null;
  if (classifyEmail(email) === "kisisel") return null;
  return emailDomain(email).toLowerCase().replace(/^www\./, "");
}

/** Şirket anahtarı: önce alan adı, yoksa şirket adı (Türkçe duyarsız); ikisi de yoksa null (sınırlanmaz). */
export function companyKey(email: string | null | undefined, company: string | null | undefined): string | null {
  const d = companyDomain(email);
  if (d) return `d:${d}`;
  const n = company ? fold(company).replace(/[^a-z0-9]+/g, " ").trim() : "";
  return n.length >= 3 ? `n:${n}` : null;
}

/**
 * Şirket başına en fazla `max` kişiyi tutar (0 = sınırsız). `existing`, kullanıcının zaten kayıtlı kişilerinden şirket başına sayıdır;
 * o şirketten kişisi olan biri için kontenjan düşer. Sıra korunur: ilk gelenler tutulur.
 */
export function limitPerCompany<T extends { email: string; company: string | null }>(items: T[], max: number, existing: ReadonlyMap<string, number> = new Map()): { kept: T[]; dropped: T[] } {
  if (max <= 0) return { kept: items, dropped: [] };
  const counts = new Map(existing);
  const kept: T[] = [];
  const dropped: T[] = [];
  for (const it of items) {
    const key = companyKey(it.email, it.company);
    if (!key) {
      kept.push(it);
      continue;
    }
    const n = counts.get(key) ?? 0;
    if (n >= max) dropped.push(it);
    else {
      counts.set(key, n + 1);
      kept.push(it);
    }
  }
  return { kept, dropped };
}
