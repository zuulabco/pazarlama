import "server-only";
import { db } from "@/lib/supabase/server";
import { getAccount, InsufficientCreditsError, refundCredits, spendCredits } from "./account";
import { limitPerCompany } from "./company";
import { shortName, type BrowseRow, type LeadBrowse, type LeadSearchInput, type SavedSearch } from "./lead-options";
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

/**
 * Kişi bul v2: önce listele (kredi düşmez, günlük hakla sınırlı), sonra seçilenleri ekle (kişi başına 1 kredi).
 * Sağlayıcı kayıtları sunucuda saklanır; istemciye soyadı, e-posta ve LinkedIn gizlenmiş hâli gider. Bu yüzden
 * listelemek, ücretsiz kişi bilgisi almanın bir yolu olamaz.
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
  items: Record<string, unknown>[] | null;
  apify_run_id: string | null;
  error: string | null;
  created_at: string;
};

/** Saklanacak sağlayıcı alanları (gerisi atılır). */
const KEEP = ["first_name", "last_name", "email", "organization_name", "organization_primary_domain", "organization_website_url", "city", "state", "country", "title", "headline", "linkedin_url"] as const;
const trim = (item: Record<string, unknown>) => Object.fromEntries(KEEP.filter((k) => item[k] != null).map((k) => [k, item[k]]));

const place = (item: Record<string, unknown>) =>
  [item.city, item.state, item.country]
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(", ") || null;

/** Son 24 saatte listelenen kişi sayısı (kayıtlı aramalar ve başarısızlar sayılmaz). */
export async function browseUsedToday(uid: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { data, error } = await db().from("outreach_lead_searches").select("size").eq("user_uid", uid).eq("saved", false).neq("status", "hata").gte("created_at", since).returns<{ size: number }[]>();
  unavailable(error);
  return (data ?? []).reduce((n, r) => n + r.size, 0);
}

function view(row: Row, rows: BrowseRow[], hidden = { owned: 0, sameCompany: 0 }): LeadBrowse {
  return { id: row.id, status: row.status, size: row.size, found: row.found, rows, hidden, error: row.error, query: row.query, createdAt: row.created_at };
}

export async function startLeadBrowse(uid: string, q: LeadSearchInput): Promise<LeadBrowse> {
  const { plan } = await getAccount(uid);
  const used = await browseUsedToday(uid);
  if (used + q.count > plan.browsePerDay) {
    const left = Math.max(plan.browsePerDay - used, 0);
    throw new LeadSearchError(left > 0 ? `Bugün ${left} kişi daha listeleyebilirsiniz (${plan.label} paketi). Kişi sayısını azaltın.` : `Bugünkü listeleme hakkınız (${plan.browsePerDay} kişi) doldu. Yarın yenilenir.`, 429);
  }
  const open = await db().from("outreach_lead_searches").select("id", { count: "exact", head: true }).eq("user_uid", uid).eq("status", "calisiyor");
  unavailable(open.error);
  if ((open.count ?? 0) >= 3) throw new LeadSearchError("Devam eden aramalarınız bitsin, sonra yenisini başlatın.", 429);

  await assertProviderBudget(estimateUsd(q.count));
  const created = await db().from("outreach_lead_searches").insert({ user_uid: uid, query: q, size: q.count }).select("*").single<Row>();
  unavailable(created.error);
  const row = created.data!;
  try {
    const params = new URLSearchParams({ maxTotalChargeUsd: String(Math.min(estimateUsd(q.count) * 1.5 + 0.01, 3)), timeout: "300" });
    const { data } = await apify<{ data: { id: string } }>(`/acts/${ACTOR}/runs?${params}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildActorInput(q)) });
    await db().from("outreach_lead_searches").update({ apify_run_id: data.id }).eq("id", row.id);
    return view({ ...row, apify_run_id: data.id }, []);
  } catch (e) {
    console.error("Kişi listeleme başlatılamadı:", e instanceof Error ? e.message : e);
    await db().from("outreach_lead_searches").update({ status: "hata", error: "Arama başlatılamadı.", finished_at: new Date().toISOString() }).eq("id", row.id);
    throw new LeadSearchError("Arama şu an başlatılamadı. Biraz sonra tekrar deneyin.", 503);
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

/** Koşu bittiyse sonuçları saklar. Birden çok kez çağrılabilir. */
async function refresh(row: Row): Promise<Row> {
  if (row.status !== "calisiyor" || !row.apify_run_id) return row;
  const { data: run } = await apify<{ data: { status: string; defaultDatasetId: string } }>(`/actor-runs/${encodeURIComponent(row.apify_run_id)}`);
  if (RUNNING.has(run.status)) {
    // Çok uzun süren koşu: kullanıcıyı sonsuza dek bekletme.
    if (Date.now() - Date.parse(row.created_at) > 10 * 60_000) return finishSearch(row, { status: "hata", error: "Arama zaman aşımına uğradı. Tekrar deneyin." });
    return row;
  }
  if (run.status !== "SUCCEEDED") return finishSearch(row, { status: "hata", error: "Arama tamamlanamadı. Tekrar deneyin." });

  const raw = await apify<Record<string, unknown>[]>(`/datasets/${run.defaultDatasetId}/items?limit=${row.size}&clean=true`);
  const seen = new Set<string>();
  const items: Record<string, unknown>[] = [];
  for (const it of raw) {
    const email = typeof it.email === "string" ? it.email.trim().toLowerCase() : "";
    if (!email || seen.has(email)) continue;
    seen.add(email);
    items.push(trim(it));
  }
  return finishSearch(row, { status: "hazir", items, found: items.length });
}

export type BrowseOptions = { skipOwned: boolean; oneLead: boolean };

export async function getLeadBrowse(uid: string, id: string, opts: BrowseOptions): Promise<LeadBrowse | null> {
  const found = await db().from("outreach_lead_searches").select("*").eq("user_uid", uid).eq("id", id).maybeSingle<Row>();
  unavailable(found.error);
  if (!found.data) return null;
  const row = await refresh(found.data);
  if (row.status !== "hazir" || !row.items) return view(row, []);

  const owned = await existingEmails(uid, row.items.map((it) => String(it.email).toLowerCase()));
  let rows = row.items.map((it, rid) => ({
    rid,
    email: String(it.email).toLowerCase(),
    name: shortName([it.first_name, it.last_name].filter((v) => typeof v === "string").join(" ") || null),
    jobTitle: typeof it.title === "string" ? it.title : typeof it.headline === "string" ? it.headline : null,
    company: typeof it.organization_name === "string" ? it.organization_name : null,
    location: place(it),
    owned: owned.has(String(it.email).toLowerCase()),
  }));

  const hidden = { owned: 0, sameCompany: 0 };
  if (opts.skipOwned) {
    const before = rows.length;
    rows = rows.filter((r) => !r.owned);
    hidden.owned = before - rows.length;
  }
  if (opts.oneLead) {
    const { kept, dropped } = limitPerCompany(rows, 1);
    rows = kept;
    hidden.sameCompany = dropped.length;
  }
  // E-posta istemciye gönderilmez.
  return view(
    row,
    rows.map((r) => ({ rid: r.rid, name: r.name, jobTitle: r.jobTitle, company: r.company, location: r.location, owned: r.owned })),
    hidden,
  );
}

export type RevealResult = { added: number; skipped: Skipped; listName: string | null; credits: number };

/**
 * Seçilen satırları Kişiler'e ekler. Kredi yalnızca gerçekten eklenen (geçerli ve yeni) kişi için düşer; yetmezse hiçbir şey eklenmez.
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
