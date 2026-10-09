import "server-only";
import { db } from "@/lib/supabase/server";
import { getAccount, InsufficientCreditsError, refundCredits, spendCredits } from "./account";
import { blockedMessage, browseAllowance, monthStartIso } from "./browse-pool";
import { limitPerCompany } from "./company";
import { shortName, type BrowseRow, type LeadBrowse, type LeadSearchInput, type SavedSearch } from "./lead-options";
import { countPool, saveToPool, searchPool, touchPool } from "./lead-pool";
import { scoreChunk, scoringEnabled, type ScoredItem } from "./lead-score";
import {
  ACTOR,
  apify,
  assertProviderBudget,
  buildActorInput,
  estimateUsd,
  existingEmails,
  insertLeads,
  LeadSearchError,
  parseLeads,
  prepareImport,
  RUNNING,
  unavailable,
  type Skipped,
} from "./lead-search";
import { getProfile } from "../profile/repository";

/**
 * Kişi bul v2: önce listele (Spine Kredi düşmez, günlük/aylık listeleme hakkıyla sınırlı), sonra seçilenleri ekle (kişi başına 1 Spine Kredi).
 * Sağlayıcı kayıtları sunucuda saklanır; istemciye soyadı, e-posta ve LinkedIn gizlenmiş hâli gider. Bu yüzden
 * listelemek, ücretsiz kişi bilgisi almanın bir yolu olamaz.
 *
 * Akış: (1) ortak havuzdan uyanlar alınır, eksik kısım için sağlayıcıya gidilir; (2) JEV her kişiyi kullanıcının profiline göre skorlar;
 * (3) liste skora göre sıralanır, zaten kayıtlı kişiler atlanır ve her şirketten en uygun tek kişi gösterilir (bunlar her zaman açıktır).
 */

type Row = {
  id: string;
  user_uid: string;
  name: string | null;
  saved: boolean;
  query: LeadSearchInput;
  status: "calisiyor" | "hazir" | "hata";
  size: number;
  found: number;
  items: ScoredItem[] | null;
  apify_run_id: string | null;
  error: string | null;
  created_at: string;
};

/** Saklanacak sağlayıcı alanları (gerisi atılır). `_p`: havuzdan geldi, `_s`: JEV skoru (null = skorlanamadı). */
const KEEP = ["first_name", "last_name", "email", "organization_name", "organization_primary_domain", "organization_website_url", "city", "state", "country", "title", "headline", "linkedin_url", "_p"] as const;
const trim = (item: Record<string, unknown>): ScoredItem => Object.fromEntries(KEEP.filter((k) => item[k] != null).map((k) => [k, item[k]]));

const place = (item: Record<string, unknown>) =>
  [item.city, item.state, item.country]
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(", ") || null;

const emailOf = (it: Record<string, unknown>) => (typeof it.email === "string" ? it.email.trim().toLowerCase() : "");

/** Son 24 saatte listelenen kişi sayısı (kayıtlı aramalar ve başarısızlar sayılmaz). */
export async function browseUsedToday(uid: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { data, error } = await db().from("outreach_lead_searches").select("size").eq("user_uid", uid).eq("saved", false).neq("status", "hata").gte("created_at", since).returns<{ size: number }[]>();
  unavailable(error);
  return (data ?? []).reduce((n, r) => n + r.size, 0);
}

/** Bu ay (İstanbul takvimi) listelenen kişi sayısı. */
export async function browseUsedThisMonth(uid: string): Promise<number> {
  const { data, error } = await db().from("outreach_lead_searches").select("size").eq("user_uid", uid).eq("saved", false).neq("status", "hata").gte("created_at", monthStartIso()).returns<{ size: number }[]>();
  unavailable(error);
  return (data ?? []).reduce((n, r) => n + r.size, 0);
}

function view(row: Row, rows: BrowseRow[], hidden = { owned: 0, sameCompany: 0 }): LeadBrowse {
  return { id: row.id, status: row.status, size: row.size, found: row.found, rows, hidden, error: row.error, query: row.query, createdAt: row.created_at };
}

/** Havuzdan gelecek adaylar: kullanıcının zaten kayıtlı olanları atılır, her şirketten tek kişi alınır, istenen sayıyı geçmez. */
async function poolCandidates(uid: string, q: LeadSearchInput, exclude: ReadonlySet<string> = new Set()): Promise<ScoredItem[]> {
  const found = (await searchPool(q, q.count * 3 + exclude.size)).map(trim).filter((it) => !exclude.has(emailOf(it)));
  if (found.length === 0) return [];
  const owned = await existingEmails(uid, found.map(emailOf));
  const fresh = found.filter((it) => !owned.has(emailOf(it)));
  const { kept } = limitPerCompany(
    fresh.map((it) => ({ it, email: emailOf(it), company: typeof it.organization_name === "string" ? it.organization_name : null })),
    1,
  );
  const chosen = kept.slice(0, q.count).map((k) => k.it);
  void touchPool(chosen.map(emailOf));
  return chosen;
}

export async function startLeadBrowse(uid: string, q: LeadSearchInput): Promise<LeadBrowse> {
  const { plan } = await getAccount(uid);
  const [usedToday, usedMonth] = await Promise.all([browseUsedToday(uid), browseUsedThisMonth(uid)]);
  const allowance = browseAllowance({ usedToday, usedMonth, perDay: plan.browsePerDay, perMonth: plan.browsePerMonth });
  if (q.count > allowance.left) throw new LeadSearchError(blockedMessage(allowance, plan.label, plan.browsePerMonth, plan.browsePerDay, q.count), 429);
  const open = await db().from("outreach_lead_searches").select("id", { count: "exact", head: true }).eq("user_uid", uid).eq("status", "calisiyor");
  unavailable(open.error);
  if ((open.count ?? 0) >= 3) throw new LeadSearchError("Devam eden aramalarınız bitsin, sonra yenisini başlatın.", 429);

  // Havuzdaki kişiler sağlayıcıya sorulmadan gelir; yalnızca eksik kısım (ve süzmeler için küçük bir pay) sağlayıcıdan istenir.
  const fromPool = await poolCandidates(uid, q);
  const lacking = q.count - fromPool.length;
  // Sağlayıcı sıralamayı sabit verir ve atlama (offset) desteklemez: havuzda zaten bilinen kişiler de dönecektir, yeni olanlara ulaşmak için o kadar fazla istenir.
  const ask = lacking > 0 ? Math.min((await countPool(q)) + Math.ceil(lacking * 1.2) + 2, 500) : 0;
  if (ask > 0) await assertProviderBudget(estimateUsd(ask));

  const created = await db().from("outreach_lead_searches").insert({ user_uid: uid, query: q, size: q.count, items: fromPool.length ? fromPool : null }).select("*").single<Row>();
  unavailable(created.error);
  const row = created.data!;
  if (ask === 0) return view(row, []);
  try {
    const params = new URLSearchParams({ maxTotalChargeUsd: String(Math.min(estimateUsd(ask) * 1.5 + 0.01, 3)), timeout: "300" });
    const { data } = await apify<{ data: { id: string } }>(`/acts/${ACTOR}/runs?${params}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildActorInput(q, ask)) });
    await db().from("outreach_lead_searches").update({ apify_run_id: data.id }).eq("id", row.id);
    return view({ ...row, apify_run_id: data.id }, []);
  } catch (e) {
    console.error("Kişi listeleme başlatılamadı:", e instanceof Error ? e.message : e);
    // Havuzdan gelenler varsa arama onlarla sürer; hiç yoksa hata.
    if (fromPool.length > 0) return view(row, []);
    await db().from("outreach_lead_searches").update({ status: "hata", error: "Arama başlatılamadı.", finished_at: new Date().toISOString() }).eq("id", row.id);
    throw new LeadSearchError("Arama şu an başlatılamadı. Biraz sonra tekrar deneyin.", 503);
  }
}

/**
 * Hazır bir listeye "daha fazla" kişi ekler: aynı filtrelerle, zaten listelenenler hariç `extra` kişi daha getirilir ve aynı aramaya eklenir
 * (satır numaraları değişmez; liste yeniden skorlanıp sıralanır). Listeleme hakkından yalnızca eklenen sayı düşer.
 */
export async function extendLeadBrowse(uid: string, id: string, extra: number): Promise<LeadBrowse> {
  const found = await db().from("outreach_lead_searches").select("*").eq("user_uid", uid).eq("id", id).maybeSingle<Row>();
  unavailable(found.error);
  const row = found.data;
  if (!row || row.status !== "hazir" || !row.items) throw new LeadSearchError("Önce arama bitsin, sonra daha fazlasını listeleyin.", 409);

  const { plan } = await getAccount(uid);
  const [usedToday, usedMonth] = await Promise.all([browseUsedToday(uid), browseUsedThisMonth(uid)]);
  const allowance = browseAllowance({ usedToday, usedMonth, perDay: plan.browsePerDay, perMonth: plan.browsePerMonth });
  if (extra > allowance.left) throw new LeadSearchError(blockedMessage(allowance, plan.label, plan.browsePerMonth, plan.browsePerDay, extra), 429);

  const q = { ...row.query, count: extra };
  const have = new Set(row.items.map(emailOf));
  const fromPool = await poolCandidates(uid, q, have);
  const lacking = extra - fromPool.length;
  // Sağlayıcı aynı sıralamayı verdiği için, bilinen kişiler de dahil istenir; böylece yeni kişiler gelir.
  const ask = lacking > 0 ? Math.min(Math.max(row.items.length, await countPool(q)) + Math.ceil(lacking * 1.2) + 2, 500) : 0;
  if (ask > 0) await assertProviderBudget(estimateUsd(ask));

  const items = [...row.items, ...fromPool];
  const updated = await db().from("outreach_lead_searches").update({ status: "calisiyor", size: row.size + extra, items, finished_at: null }).eq("id", id).eq("status", "hazir").select("*").maybeSingle<Row>();
  unavailable(updated.error);
  if (!updated.data) throw new LeadSearchError("Arama şu an genişletilemiyor. Tekrar deneyin.", 409);
  if (ask === 0) return view(updated.data, []);
  try {
    const params = new URLSearchParams({ maxTotalChargeUsd: String(Math.min(estimateUsd(ask) * 1.5 + 0.01, 3)), timeout: "300" });
    const { data } = await apify<{ data: { id: string } }>(`/acts/${ACTOR}/runs?${params}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildActorInput(q, ask)) });
    await db().from("outreach_lead_searches").update({ apify_run_id: data.id }).eq("id", id);
    return view({ ...updated.data, apify_run_id: data.id }, []);
  } catch (e) {
    console.error("Daha fazla kişi listelenemedi:", e instanceof Error ? e.message : e);
    if (fromPool.length > 0) return view(updated.data, []);
    // Eski haline döner: liste olduğu gibi kalır, hak düşmez.
    await db().from("outreach_lead_searches").update({ status: "hazir", size: row.size, items: row.items }).eq("id", id);
    throw new LeadSearchError("Şu an daha fazla kişi listelenemedi. Biraz sonra tekrar deneyin.", 503);
  }
}

async function finishSearch(row: Row, patch: Partial<Row>): Promise<Row> {
  const { data, error } = await db().from("outreach_lead_searches").update({ ...patch, finished_at: new Date().toISOString() }).eq("id", row.id).eq("status", "calisiyor").select("*").maybeSingle<Row>();
  unavailable(error);
  if (data) return data;
  // Başka bir istek önce davrandı.
  const again = await db().from("outreach_lead_searches").select("*").eq("id", row.id).single<Row>();
  return again.data!;
}

/** Bitmeden güncelle (arama hâlâ sürüyor). */
async function progress(row: Row, patch: Partial<Row>): Promise<Row> {
  const { data, error } = await db().from("outreach_lead_searches").update(patch).eq("id", row.id).eq("status", "calisiyor").select("*").maybeSingle<Row>();
  unavailable(error);
  return data ?? row;
}

/** Bir tur skorlamada en çok bu kadar kişi (istek süresini aşmamak için); aynı anda 10 JEV isteği. */
const SCORE_PER_TURN = 120;

/**
 * Aramayı bir adım ilerletir (istemci yoklaması çağırır; birden çok kez çağrılabilir): sağlayıcı koşusu bittiyse sonuçlar havuz kayıtlarıyla
 * birleştirilir, sonra kişiler JEV ile skorlanır; hepsi bitince arama "hazır" olur.
 */
async function refresh(row: Row, uid: string): Promise<Row> {
  if (row.status !== "calisiyor") return row;
  let cur = row;

  if (cur.apify_run_id) {
    const pooled = cur.items?.length ?? 0;
    const { data: run } = await apify<{ data: { status: string; defaultDatasetId: string } }>(`/actor-runs/${encodeURIComponent(cur.apify_run_id)}`);
    if (RUNNING.has(run.status)) {
      // Çok uzun süren koşu: kullanıcıyı sonsuza dek bekletme; havuzdan gelenlerle sürdür.
      if (Date.now() - Date.parse(cur.created_at) <= 10 * 60_000) return cur;
      if (pooled === 0) return finishSearch(cur, { status: "hata", error: "Arama zaman aşımına uğradı. Tekrar deneyin." });
      cur = await progress(cur, { apify_run_id: null });
    } else if (run.status !== "SUCCEEDED") {
      if (pooled === 0) return finishSearch(cur, { status: "hata", error: "Arama tamamlanamadı. Tekrar deneyin." });
      cur = await progress(cur, { apify_run_id: null });
    } else {
      const raw = await apify<Record<string, unknown>[]>(`/datasets/${run.defaultDatasetId}/items?limit=${Math.min(cur.size * 2 + 10, 1000)}&clean=true`);
      const seen = new Set((cur.items ?? []).map(emailOf));
      const merged: ScoredItem[] = [...(cur.items ?? [])];
      for (const it of raw) {
        const email = emailOf(it);
        if (!email || seen.has(email)) continue;
        seen.add(email);
        merged.push(trim(it));
      }
      // Sağlayıcıdan gelen her kişi havuza yazılır: aynı kişi için bir daha ödeme yapılmaz, veritabanı zamanla büyür.
      void saveToPool(raw, cur.query);
      cur = await progress(cur, { items: merged, apify_run_id: null });
      if (cur.status !== "calisiyor") return cur;
    }
  }

  const items = cur.items ?? [];
  if (items.length === 0) return finishSearch(cur, { status: "hazir", found: 0, items: [] });

  // JEV skorlaması (kısmi turlar; hepsi skorlanınca ya da skorlama kapalıysa biter).
  const profile = scoringEnabled() ? await getProfile(uid) : null;
  if (profile) await scoreChunk(profile, items, cur.query, { max: SCORE_PER_TURN, concurrency: 10, deadlineMs: 35_000 });
  else for (const it of items) if (it._s === undefined) it._s = null;

  if (items.some((it) => it._s === undefined)) return progress(cur, { items });
  return finishSearch(cur, { status: "hazir", items, found: items.length });
}

export async function getLeadBrowse(uid: string, id: string): Promise<LeadBrowse | null> {
  const found = await db().from("outreach_lead_searches").select("*").eq("user_uid", uid).eq("id", id).maybeSingle<Row>();
  unavailable(found.error);
  if (!found.data) return null;
  const row = await refresh(found.data, uid);
  if (row.status !== "hazir" || !row.items) return view(row, []);

  const owned = await existingEmails(uid, row.items.map(emailOf));
  const all = row.items.map((it, rid) => ({
    rid,
    email: emailOf(it),
    name: shortName([it.first_name, it.last_name].filter((v) => typeof v === "string").join(" ") || null),
    jobTitle: typeof it.title === "string" ? it.title : typeof it.headline === "string" ? it.headline : null,
    company: typeof it.organization_name === "string" ? it.organization_name : null,
    location: place(it),
    owned: owned.has(emailOf(it)),
    score: typeof it._s === "number" ? it._s : null,
  }));

  // Zaten kayıtlı kişiler atlanır; kalanlar skora göre (yüksekten düşüğe, skorsuzlar sonda) sıralanır; her şirketten en yüksek skorlu tek kişi kalır.
  const fresh = all.filter((r) => !r.owned);
  const sorted = [...fresh].sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.rid - b.rid);
  const { kept, dropped } = limitPerCompany(sorted, 1);
  const hidden = { owned: all.length - fresh.length, sameCompany: dropped.length };
  // E-posta istemciye gönderilmez.
  return view(
    row,
    kept.slice(0, row.size).map((r) => ({ rid: r.rid, name: r.name, jobTitle: r.jobTitle, company: r.company, location: r.location, owned: r.owned, score: r.score })),
    hidden,
  );
}

export type RevealResult = { added: number; skipped: Skipped; listName: string | null; credits: number };

/**
 * Seçilen satırları Kişiler'e ekler. Spine Kredi yalnızca gerçekten eklenen (geçerli ve yeni) kişi için düşer; yetmezse hiçbir şey eklenmez.
 * Eklenen kişiler ortak havuza da yazılır (sonraki aramalarda sağlayıcıya yeniden ödeme yapılmaz).
 */
export async function revealLeads(uid: string, id: string, rids: number[], listId: string | null): Promise<RevealResult> {
  const found = await db().from("outreach_lead_searches").select("*").eq("user_uid", uid).eq("id", id).maybeSingle<Row>();
  unavailable(found.error);
  const row = found.data;
  if (!row || row.status !== "hazir" || !row.items) throw new LeadSearchError("Arama sonuçları bulunamadı. Aramayı yenileyin.", 404);

  const items = row.items;
  const picked = [...new Set(rids)]
    .filter((r) => Number.isInteger(r) && r >= 0 && r < items.length)
    .slice(0, 200)
    .map((r) => items[r]);
  if (picked.length === 0) throw new LeadSearchError("Eklenecek kişi seçin.", 400);

  const parsed = parseLeads(picked);
  const { batch, skipped } = await prepareImport(uid, parsed.leads, { perCompany: 0, skipped: parsed.skipped });
  if (batch.length === 0) return { added: 0, skipped, listName: null, credits: (await getAccount(uid)).credits };

  const credits = await spendCredits(uid, batch.length, "arama", id); // yetmezse InsufficientCreditsError
  try {
    const { added, listName } = await insertLeads(uid, batch, { tag: id, listId });
    const inserted = new Set(batch.map((b) => String(b.email).toLowerCase()));
    void saveToPool(picked.filter((it) => inserted.has(emailOf(it))), row.query);
    return { added, skipped, listName, credits };
  } catch (e) {
    await refundCredits(uid, batch.length, id).catch(() => undefined);
    throw e;
  }
}

export { InsufficientCreditsError };

// ─── Kayıtlı aramalar ───────────────────────────────────────────────────────────────────────────

export async function listSavedSearches(uid: string): Promise<SavedSearch[]> {
  const { data, error } = await db()
    .from("outreach_lead_searches")
    .select("id, name, query, created_at")
    .eq("user_uid", uid)
    .eq("saved", true)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<{ id: string; name: string | null; query: LeadSearchInput; created_at: string }[]>();
  unavailable(error);
  return (data ?? []).map((r) => ({ id: r.id, name: r.name ?? "Arama", query: r.query, createdAt: r.created_at }));
}

export async function saveSearch(uid: string, name: string, query: LeadSearchInput): Promise<SavedSearch> {
  const count = await db().from("outreach_lead_searches").select("id", { count: "exact", head: true }).eq("user_uid", uid).eq("saved", true);
  unavailable(count.error);
  if ((count.count ?? 0) >= 30) throw new LeadSearchError("En fazla 30 arama kaydedebilirsiniz.", 409);
  const { data, error } = await db()
    .from("outreach_lead_searches")
    .insert({ user_uid: uid, name, saved: true, query, status: "hazir", size: Math.min(Math.max(query.count, 5), 200) })
    .select("id, name, query, created_at")
    .single<{ id: string; name: string; query: LeadSearchInput; created_at: string }>();
  unavailable(error);
  return { id: data!.id, name: data!.name, query: data!.query, createdAt: data!.created_at };
}

export async function deleteSavedSearch(uid: string, id: string) {
  const { error } = await db().from("outreach_lead_searches").delete().eq("user_uid", uid).eq("id", id).eq("saved", true);
  unavailable(error);
}

/** Zamanlayıcı: 7 günden eski oturum aramalarını (kayıtlı olmayanları) siler. */
export async function purgeOldBrowses(): Promise<void> {
  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
  await db().from("outreach_lead_searches").delete().eq("saved", false).lt("created_at", cutoff);
}

