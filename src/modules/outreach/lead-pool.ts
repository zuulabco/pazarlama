import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/supabase/server";
import { fold } from "@/lib/text";
import { decryptSecret, encryptSecret } from "./crypto";
import { classifyEmail } from "./discover/emails";
import { expandKeywords, expandNotTitles, expandTitles, type LeadSearchInput } from "./lead-options";

/**
 * Ortak kişi havuzu: sağlayıcıdan gelen her kişi (şifreli e-postayla) burada saklanır, böylece veritabanı zamanla büyür; sonraki aramalar önce havuza bakar
 * ve eksik kısmı için sağlayıcıya gider. Tablo yoksa ya da LEAD_POOL=0 ise sessizce devre dışıdır. Tasarım: docs/veri-havuzu-tasarimi.md.
 */

export const poolEnabled = () => process.env.LEAD_POOL !== "0";

/** Kullanılmayan kayıtlar bu kadar gün sonra silinir (24 ay). Havuzdan bir aramaya verilen ya da yeniden görülen kayıt "kullanılmış" sayılır. */
export const RETENTION_DAYS = 730;

/** Havuza yalnızca şirket alan adlı adresler yazılır; gmail/hotmail gibi kişisel adresler kullanıcıya listelenir ama saklanmaz. */
export const poolable = (email: string) => classifyEmail(email) !== "kisisel";

export const emailHash = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
const missing = (e: { code?: string } | null) => e?.code === "42P01" || e?.code === "PGRST205";

type Row = {
  email_hash: string;
  email_enc: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  org_name: string | null;
  org_domain: string | null;
  org_website: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  linkedin_url: string | null;
  industries: string[];
  sizes: string[];
  keywords: string[];
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const union = (a: string[] | null | undefined, b: readonly string[]) => [...new Set([...(a ?? []), ...b])];

/** Sağlayıcıdan gelen (ve kaydedilen) kişileri havuza yazar (e-posta özeti zaten varsa yalnızca etiketler ve son görülme güncellenir). Hata kullanıcıyı etkilemez. */
export async function saveToPool(items: Record<string, unknown>[], q: Pick<LeadSearchInput, "industries" | "sizes" | "keywords">): Promise<void> {
  if (!poolEnabled() || items.length === 0) return;
  try {
    const keywords = expandKeywords(q.keywords);
    const rows = items.flatMap((it) => {
      const email = str(it.email)?.toLowerCase();
      return email && poolable(email) ? [{ email, hash: emailHash(email), it }] : [];
    });
    if (rows.length === 0) return;
    const hashes = rows.map((r) => r.hash);
    const [opt, have] = await Promise.all([
      db().from("lead_pool_optout").select("email_hash").in("email_hash", hashes).returns<{ email_hash: string }[]>(),
      db().from("lead_pool").select("email_hash, industries, sizes, keywords").in("email_hash", hashes).returns<{ email_hash: string; industries: string[]; sizes: string[]; keywords: string[] }[]>(),
    ]);
    if (missing(opt.error) || missing(have.error)) return;
    const out = new Set((opt.data ?? []).map((r) => r.email_hash));
    const existing = new Map((have.data ?? []).map((r) => [r.email_hash, r]));
    const now = new Date().toISOString();
    const payload = rows
      .filter((r) => !out.has(r.hash))
      .map(({ email, hash, it }) => {
        const old = existing.get(hash);
        const city = str(it.city);
        const country = str(it.country);
        return {
          email_hash: hash,
          email_enc: encryptSecret(email),
          first_name: str(it.first_name),
          last_name: str(it.last_name),
          title: str(it.title) ?? str(it.headline),
          org_name: str(it.organization_name),
          org_domain: str(it.organization_primary_domain),
          org_website: str(it.organization_website_url),
          city,
          state: str(it.state),
          country,
          city_key: city ? fold(city) : null,
          country_key: country ? fold(country) : null,
          linkedin_url: str(it.linkedin_url),
          industries: union(old?.industries, q.industries),
          sizes: union(old?.sizes, q.sizes),
          keywords: union(old?.keywords, keywords),
          last_seen_at: now,
        };
      });
    if (payload.length === 0) return;
    for (let i = 0; i < payload.length; i += 300) {
      const { error } = await db().from("lead_pool").upsert(payload.slice(i, i + 300), { onConflict: "email_hash" });
      if (error) {
        if (!missing(error)) console.error("Havuza yazılamadı:", error.message);
        return;
      }
    }
  } catch (e) {
    console.error("Havuza yazılamadı:", e instanceof Error ? e.message : e);
  }
}

/** Aramaya uyan havuz satırları (e-posta henüz çözülmemiş). Ülke/şehir, sektör, büyüklük ve kelimeler veritabanında; unvan eşleşmesi bellekte. */
async function candidates(q: LeadSearchInput, limit: number): Promise<Row[]> {
  let query = db()
    .from("lead_pool")
    .select("email_hash, email_enc, first_name, last_name, title, org_name, org_domain, org_website, city, state, country, linkedin_url")
    .eq("status", "gecerli")
    .eq("country_key", fold(q.country));
  if (q.city?.trim()) query = query.eq("city_key", fold(q.city));
  if (q.industries.length) query = query.overlaps("industries", [...q.industries]);
  if (q.sizes.length) query = query.overlaps("sizes", [...q.sizes]);
  if (q.keywords.length) query = query.overlaps("keywords", expandKeywords(q.keywords));
  const { data, error } = await query.order("last_seen_at", { ascending: false }).limit(limit).returns<Row[]>();
  if (error) {
    if (!missing(error)) console.error("Havuz okunamadı:", error.message);
    return [];
  }
  const want = expandTitles(q).map(fold);
  const not = expandNotTitles(q).map(fold);
  const hit = (data ?? []).filter((r) => {
    const title = fold(r.title ?? "");
    if (want.length > 0 && !want.some((w) => title.includes(w))) return false;
    return !not.some((w) => title.includes(w));
  });
  if (hit.length === 0) return [];
  const opt = await db().from("lead_pool_optout").select("email_hash").in("email_hash", hit.map((r) => r.email_hash)).returns<{ email_hash: string }[]>();
  const out = new Set((opt.data ?? []).map((r) => r.email_hash));
  return hit.filter((r) => !out.has(r.email_hash));
}

/** Aramaya uyan toplam havuz kaydı sayısı (sağlayıcıdan ne kadar fazla istenmesi gerektiğini hesaplamak için). */
export async function countPool(q: LeadSearchInput): Promise<number> {
  if (!poolEnabled()) return 0;
  try {
    return (await candidates(q, 1000)).length;
  } catch {
    return 0;
  }
}

/** Aramaya uyan havuz kayıtları, sağlayıcı biçiminde (e-posta çözülmüş, `_p: 1` işaretli). En yeni kayıtlar önce gelir. */
export async function searchPool(q: LeadSearchInput, limit: number): Promise<Record<string, unknown>[]> {
  if (!poolEnabled() || limit <= 0) return [];
  try {
    return (await candidates(q, 800))
      .slice(0, limit)
      .flatMap((r) => {
        try {
          return [
            {
              first_name: r.first_name,
              last_name: r.last_name,
              email: decryptSecret(r.email_enc),
              title: r.title,
              organization_name: r.org_name,
              organization_primary_domain: r.org_domain,
              organization_website_url: r.org_website,
              city: r.city,
              state: r.state,
              country: r.country,
              linkedin_url: r.linkedin_url,
              _p: 1,
            } as Record<string, unknown>,
          ];
        } catch {
          return [];
        }
      });
  } catch (e) {
    console.error("Havuz okunamadı:", e instanceof Error ? e.message : e);
    return [];
  }
}

/** Aramaya verilen havuz kayıtlarının "son kullanım" tarihini yeniler (saklama süresi kullanıma göre uzar). */
export async function touchPool(emails: string[]): Promise<void> {
  if (!poolEnabled() || emails.length === 0) return;
  try {
    const hashes = emails.map(emailHash);
    for (let i = 0; i < hashes.length; i += 300) {
      await db().from("lead_pool").update({ last_seen_at: new Date().toISOString() }).in("email_hash", hashes.slice(i, i + 300));
    }
  } catch {
    // Saklama süresi yenilenemezse arama etkilenmez.
  }
}

/** Saklama süresi dolan (24 aydır kullanılmayan) kayıtları siler. Zamanlayıcı çağırır. Silinen sayıyı döndürür. */
export async function purgePool(now = Date.now()): Promise<number> {
  if (!poolEnabled()) return 0;
  const cutoff = new Date(now - RETENTION_DAYS * 86_400_000).toISOString();
  const { data, error } = await db().from("lead_pool").delete().lt("last_seen_at", cutoff).select("email_hash");
  if (error) {
    if (!missing(error)) console.error("Havuz temizlenemedi:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

/** Kişinin silme talebi: kayıt havuzdan silinir ve bir daha eklenmez (e-posta yalnızca özeti saklanır). */
export async function removeFromPool(email: string): Promise<void> {
  const hash = emailHash(email);
  const del = await db().from("lead_pool").delete().eq("email_hash", hash);
  if (del.error && !missing(del.error)) throw new Error(del.error.message);
  const ins = await db().from("lead_pool_optout").upsert({ email_hash: hash }, { onConflict: "email_hash" });
  if (ins.error && !missing(ins.error)) throw new Error(ins.error.message);
}
