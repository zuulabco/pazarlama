import "server-only";
import { db } from "@/lib/supabase/server";
import type { Place } from "./apify";
import { leaseSeconds } from "./config";
import { leadSorts, type LeadSort, type Presence } from "./sorts";

export { leadSorts, type LeadSort, type Presence };
import type { FinalScores } from "./scoring";
import type { JevScores } from "./jev";

export type SearchStatus = "pending" | "scraping" | "scoring" | "done" | "failed";

export type Search = {
  id: string;
  user_uid: string;
  query: string;
  location: string;
  max_results: number;
  status: SearchStatus;
  apify_run_id: string | null;
  apify_dataset_id: string | null;
  total_found: number;
  total_scored: number;
  error: string | null;
  created_at: string;
  updated_at: string;
};

const searchColumns =
  "id, user_uid, query, location, max_results, status, apify_run_id, apify_dataset_id, total_found, total_scored, error, created_at, updated_at";

const fail = (what: string, error: { message: string }): never => {
  throw new Error(`${what}: ${error.message}`);
};

export const isActive = (s: SearchStatus) => s === "pending" || s === "scraping" || s === "scoring";

// ─── Aramalar ────────────────────────────────────────────────────────────────

export async function createSearch(uid: string, input: { query: string; location: string; maxResults: number }) {
  const { data, error } = await db()
    .from("lead_searches")
    .insert({ user_uid: uid, query: input.query, location: input.location, max_results: input.maxResults })
    .select(searchColumns)
    .single<Search>();
  if (error) return fail("Arama oluşturulamadı", error);
  return data;
}

export async function updateSearch(id: string, patch: Partial<Omit<Search, "id" | "user_uid" | "created_at">>) {
  const { error } = await db().from("lead_searches").update(patch).eq("id", id);
  if (error) fail("Arama güncellenemedi", error);
}

/** Kullanıcıya ait aramayı döndürür; başkasının aramasına erişilemez. */
export async function getSearch(uid: string, id: string) {
  const { data, error } = await db()
    .from("lead_searches")
    .select(searchColumns)
    .eq("id", id)
    .eq("user_uid", uid)
    .maybeSingle<Search>();
  if (error) return fail("Arama okunamadı", error);
  return data;
}

/** Yalnızca sunucu içi akışlar (webhook, işlem hattı) için: kullanıcı filtresi yoktur. */
export async function getSearchInternal(id: string) {
  const { data, error } = await db().from("lead_searches").select(searchColumns).eq("id", id).maybeSingle<Search>();
  if (error) return fail("Arama okunamadı", error);
  return data;
}

export async function findSearchByRun(runId: string) {
  const { data, error } = await db()
    .from("lead_searches")
    .select(searchColumns)
    .eq("apify_run_id", runId)
    .maybeSingle<Search>();
  if (error) return fail("Arama okunamadı", error);
  return data;
}

export async function listSearches(uid: string, limit = 8) {
  const { data, error } = await db()
    .from("lead_searches")
    .select(searchColumns)
    .eq("user_uid", uid)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Search[]>();
  if (error) return fail("Aramalar okunamadı", error);
  return data;
}

/** Aramayı ve firmalarını siler (firmalar zincirleme silinir). Takibe alınmış firmalar etkilenmez: kendi kopyalarını tutar. */
export async function deleteSearch(uid: string, id: string) {
  const { error } = await db().from("lead_searches").delete().eq("user_uid", uid).eq("id", id);
  if (error) fail("Arama silinemedi", error);
}

export async function countSearchesSince(uid: string, since: Date) {
  const { count, error } = await db()
    .from("lead_searches")
    .select("id", { count: "exact", head: true })
    .eq("user_uid", uid)
    .gte("created_at", since.toISOString());
  if (error) return fail("Arama sayısı okunamadı", error);
  return count ?? 0;
}

export async function hasActiveSearch(uid: string, since: Date) {
  const { count, error } = await db()
    .from("lead_searches")
    .select("id", { count: "exact", head: true })
    .eq("user_uid", uid)
    .in("status", ["pending", "scraping", "scoring"])
    .gte("created_at", since.toISOString());
  if (error) return fail("Aktif arama okunamadı", error);
  return (count ?? 0) > 0;
}

/**
 * Aramayı işlemek üzere tek bir isteğe kısa süreli devreder (kira). "scraping" durumundaki arama ya da
 * kirası dolmuş (`leaseSeconds` boyunca güncellenmemiş) "scoring" araması "scoring"e geçer; kazanan true döner.
 * Böylece aynı anda birden fazla istek (arayüz sorgusu, webhook) aynı firmaları ikinci kez puanlamaz.
 */
export async function claimBatch(id: string) {
  const staleBefore = new Date(Date.now() - leaseSeconds * 1000).toISOString();
  const { data, error } = await db()
    .from("lead_searches")
    .update({ status: "scoring" })
    .eq("id", id)
    .or(`status.eq.scraping,and(status.eq.scoring,updated_at.lt.${staleBefore})`)
    .select("id");
  if (error) return fail("Arama devralınamadı", error);
  return (data?.length ?? 0) > 0;
}

/** Koşu sürerken bir parti bittiğinde kirayı bırakır; sonraki parti yeniden devralabilir. */
export async function releaseBatch(id: string) {
  const { error } = await db().from("lead_searches").update({ status: "scraping" }).eq("id", id).eq("status", "scoring");
  if (error) fail("Arama bırakılamadı", error);
}

// ─── Firmalar ────────────────────────────────────────────────────────────────

export type LeadRow = {
  id: string;
  search_id: string;
  place_id: string;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  maps_url: string | null;
  rating: number | null;
  review_count: number | null;
  raw: Record<string, unknown>;
  sector_fit: number | null;
  company_size: number | null;
  audience_fit: number | null;
  digital_need: number | null;
  purchase_potential: number | null;
  reachability: number | null;
  priority: number | null;
  lead_score: number | null;
};

const leadColumns =
  "id, search_id, place_id, name, category, address, city, phone, website, maps_url, rating, review_count, raw, sector_fit, company_size, audience_fit, digital_need, purchase_potential, reachability, priority, lead_score";

export async function upsertLeads(searchId: string, uid: string, places: Place[]) {
  if (places.length === 0) return;
  const rows = places.map((p) => ({
    search_id: searchId,
    user_uid: uid,
    place_id: p.placeId,
    name: p.name,
    category: p.category,
    address: p.address,
    city: p.district ?? p.city,
    phone: p.phone,
    website: p.website,
    maps_url: p.mapsUrl,
    rating: p.rating,
    review_count: p.reviewCount,
    raw: p.raw,
  }));
  // Aynı arama tekrar işlenirse mevcut satırların skorları korunur (yalnızca veri alanları yazılır).
  const { error } = await db().from("leads").upsert(rows, { onConflict: "search_id,place_id" });
  if (error) fail("Firmalar kaydedilemedi", error);
}

/** Bu aramaya daha önce kaydedilmiş firmaların Google yer kimlikleri. */
export async function listPlaceIds(searchId: string) {
  const { data, error } = await db()
    .from("leads")
    .select("place_id")
    .eq("search_id", searchId)
    .returns<{ place_id: string }[]>();
  if (error) return fail("Firmalar okunamadı", error);
  return new Set(data.map((r) => r.place_id));
}

/** Henüz skorlanmamış firmaları döndürür (işlem yarıda kalırsa yalnızca kalanlar yeniden skorlanır). */
export async function listUnscored(searchId: string) {
  const { data, error } = await db()
    .from("leads")
    .select(leadColumns)
    .eq("search_id", searchId)
    .is("lead_score", null)
    .returns<LeadRow[]>();
  if (error) return fail("Firmalar okunamadı", error);
  return data;
}

export async function countScored(searchId: string) {
  const { count, error } = await db()
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("search_id", searchId)
    .not("lead_score", "is", null);
  if (error) return fail("Skorlanan sayısı okunamadı", error);
  return count ?? 0;
}

export async function saveScores(leadId: string, jev: JevScores, final: FinalScores) {
  const { error } = await db()
    .from("leads")
    .update({ ...final, jev, scored_at: new Date().toISOString() })
    .eq("id", leadId);
  if (error) fail("Skorlar kaydedilemedi", error);
}

export type LeadQuery = {
  minScore?: number;
  minDigital?: number;
  /** Web sitesi olan ("var") ya da olmayan ("yok") firmalar. */
  web?: Presence;
  /** Telefonu olan ("var") ya da olmayan ("yok") firmalar. */
  tel?: Presence;
  /** En düşük Google puanı. */
  minRating?: number;
  sort: LeadSort;
  limit: number;
};

/** Kullanıcının aramadaki firmalarını, filtre ve sıralamayla döndürür. */
export async function queryLeads(uid: string, searchId: string, q: LeadQuery) {
  let query = db()
    .from("leads")
    .select(leadColumns, { count: "exact" })
    .eq("user_uid", uid)
    .eq("search_id", searchId)
    .not("lead_score", "is", null);
  if (q.minScore !== undefined) query = query.gte("lead_score", q.minScore);
  if (q.minDigital !== undefined) query = query.gte("digital_need", q.minDigital);
  // filter() her koşulda aynı tipi döndürür; koşullu zincirler tip çıkarımını aşırı derinleştirir.
  if (q.web) query = query.filter("website", q.web === "var" ? "not.is" : "is", null);
  if (q.tel) query = query.filter("phone", q.tel === "var" ? "not.is" : "is", null);
  if (q.minRating !== undefined) query = query.filter("rating", "gte", q.minRating);

  const { data, count, error } = await query
    .order(leadSorts[q.sort].column, { ascending: false })
    .order("lead_score", { ascending: false })
    .limit(q.limit)
    .returns<LeadRow[]>();
  if (error) return fail("Firmalar okunamadı", error);
  return { rows: data, total: count ?? 0 };
}

/** Aramadaki, filtresiz toplam skorlanmış firma sayısı. */
export async function countLeads(uid: string, searchId: string) {
  const { count, error } = await db()
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("user_uid", uid)
    .eq("search_id", searchId)
    .not("lead_score", "is", null);
  if (error) return fail("Firma sayısı okunamadı", error);
  return count ?? 0;
}

/** Kullanıcıya ait tek bir firma satırı (favoriye eklerken kullanılır). */
export async function getLeadForUser(uid: string, leadId: string) {
  const { data, error } = await db()
    .from("leads")
    .select(leadColumns)
    .eq("id", leadId)
    .eq("user_uid", uid)
    .maybeSingle<LeadRow>();
  if (error) return fail("Firma okunamadı", error);
  return data;
}

/** Aramadaki tüm skorlanmış firmalar (soru kutusu için; bir arama en çok 100 firma içerir). */
export async function listScoredLeads(uid: string, searchId: string) {
  const { data, error } = await db()
    .from("leads")
    .select(leadColumns)
    .eq("user_uid", uid)
    .eq("search_id", searchId)
    .not("lead_score", "is", null)
    .limit(100)
    .returns<LeadRow[]>();
  if (error) return fail("Firmalar okunamadı", error);
  return data;
}

/** Kullanıcının bir firmayla ilgili en son kaydettiği ham arama verisi (Google yer kimliğine göre). */
export async function getLeadRaw(uid: string, placeId: string) {
  const { data, error } = await db()
    .from("leads")
    .select("raw")
    .eq("user_uid", uid)
    .eq("place_id", placeId)
    .limit(1)
    .maybeSingle<{ raw: Record<string, unknown> | null }>();
  if (error) return fail("Firma verisi okunamadı", error);
  return data?.raw ?? null;
}
