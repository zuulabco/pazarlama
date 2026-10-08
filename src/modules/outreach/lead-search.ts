import "server-only";
import { db } from "@/lib/supabase/server";
import { fold } from "@/lib/text";
import { getAccount, InsufficientCreditsError, refundCredits, spendCredits } from "./account";
import { addToList, countContacts, createList, DuplicateContactError, OutreachUnavailableError } from "./contacts";
import { checkMailDns } from "./discover/verify";
import { companyKey, limitPerCompany } from "./company";
import { classifyEmail, cleanEmail, emailDomain, isPlausibleEmail } from "./discover/emails";
import { isDisposable, statusFor } from "./discover/verify-rules";
import { isSuppressedIn, suppressionSets } from "./enrollments";
import { expandNotTitles, expandTitles, type LeadJob, type LeadSearchInput } from "./lead-options";
import { maxContacts } from "./schema";

/**
 * "Kişi bul": unvan, ülke/şehir, sektör ve şirket büyüklüğüne göre kişi ve iş e-postası bulur.
 * Akış: kredi ayrılır → sağlayıcı koşusu başlar → bitince sonuçlar doğrulanıp Kişiler'e aktarılır → kullanılmayan kredi iade edilir.
 * Kredi yalnızca Kişiler'e eklenen (e-postası geçerli ve yeni) kişi için düşer.
 */

const API = "https://api.apify.com/v2";
/** microworlds/leads-finder: seçim gerekçesi için bkz. proje belleği (doğruluk testleri). */
export const ACTOR = process.env.LEADS_ACTOR_ID || "microworlds~leads-finder";
/** Kayıt başına en yüksek sağlayıcı ücreti (ücretsiz katman) ve koşu başlangıç ücreti. */
const PER_LEAD_USD = 0.003;
const START_USD = 0.001;
/** Aylık sağlayıcı bütçesinin bu oranı dolduysa yeni arama başlamaz. */
const BUDGET_GUARD = 0.9;
const MAX_OPEN_JOBS = 3;
export const RUNNING = new Set(["READY", "RUNNING", "TIMING-OUT", "ABORTING"]);

export class LeadSearchError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

const auth = () => {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new LeadSearchError("Kişi bulma sunucuda yapılandırılmamış.", 503);
  return { Authorization: `Bearer ${token}` };
};

export async function apify<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...auth(), ...init?.headers }, cache: "no-store", signal: AbortSignal.timeout(25_000) });
  if (!res.ok) throw new Error(`Apify ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return res.json() as Promise<T>;
}

/** Sağlayıcıya gidecek girdi. Yalnızca doğrulanmış e-postalar istenir; cep telefonu istenmez (KVKK ve maliyet). */
export function buildActorInput(q: LeadSearchInput): Record<string, unknown> {
  const input: Record<string, unknown> = {
    max_result: q.count,
    include_mobile: false,
    email_status: ["verified"],
    // Sağlayıcı İngilizce yazımla eşleşir: "İstanbul" → "istanbul", "Şanlıurfa" → "sanliurfa".
    contact_location: [q.city ? fold(q.city) : q.country],
  };
  const titles = expandTitles(q);
  if (titles.length) input.contact_job_titles = titles;
  const notTitles = expandNotTitles(q);
  if (notTitles.length) input.contact_job_not_titles = notTitles;
  if (q.industries.length) input.company_industry = q.industries;
  if (q.sizes.length) input.company_num_employees_range = q.sizes;
  if (q.keywords.length) input.keywords = q.keywords;
  if (q.notKeywords.length) input.not_keywords = q.notKeywords;
  return input;
}

/** Sağlayıcıya ödenecek en çok tutar (koşuya ücret sınırı olarak konur). */
export const estimateUsd = (count: number) => START_USD + count * PER_LEAD_USD;

export type Lead = { name: string | null; company: string | null; email: string; website: string | null; city: string | null; jobTitle: string | null; linkedinUrl: string | null };

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** Sağlayıcı kaydını kişi alanlarına çevirir; e-postası olmayan kayıt null. */
export function mapLead(item: Record<string, unknown>): Lead | null {
  const rawEmail = str(item.email, 254);
  if (!rawEmail) return null;
  const name = [str(item.first_name, 60), str(item.last_name, 60)].filter(Boolean).join(" ") || null;
  const site = str(item.organization_website_url, 300) ?? (str(item.organization_primary_domain, 120) ? `https://${str(item.organization_primary_domain, 120)}` : null);
  const city = [str(item.city, 60), str(item.state, 40)].find(Boolean) ?? null;
  return {
    name: name?.slice(0, 120) ?? null,
    company: str(item.organization_name, 160),
    email: cleanEmail(rawEmail),
    website: site,
    city,
    jobTitle: str(item.title, 160) ?? str(item.headline, 160),
    linkedinUrl: str(item.linkedin_url, 300),
  };
}

type JobRow = {
  id: string;
  user_uid: string;
  status: LeadJob["status"];
  query: LeadSearchInput;
  requested: number;
  found: number;
  added: number;
  refunded: number;
  skipped: LeadJob["skipped"];
  list_name: string | null;
  apify_run_id: string | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
};

export const unavailable = (e: { code?: string; message: string } | null) => {
  if (!e) return;
  if (e.code === "42P01" || e.code === "PGRST205") throw new OutreachUnavailableError();
  throw new Error(e.message);
};

const toJob = (r: JobRow): LeadJob => ({
  id: r.id,
  status: r.status,
  requested: r.requested,
  found: r.found,
  added: r.added,
  refunded: r.refunded,
  skipped: r.skipped ?? {},
  listName: r.list_name,
  error: r.error,
  createdAt: r.created_at,
  finishedAt: r.finished_at,
});

/** Sağlayıcı aylık bütçesinin yeni aramaya yetip yetmediğine bakar (bütçeyi aşmamak için). */
export async function assertProviderBudget(extraUsd: number) {
  const { data } = await apify<{ data: { limits: { maxMonthlyUsageUsd: number }; current: { monthlyUsageUsd: number } } }>("/users/me/limits");
  if (data.current.monthlyUsageUsd + extraUsd > data.limits.maxMonthlyUsageUsd * BUDGET_GUARD) {
    throw new LeadSearchError("Kişi bulma bu ay için geçici olarak doldu. Kısa süre sonra tekrar deneyin.", 503);
  }
}

export async function startLeadSearch(uid: string, q: LeadSearchInput): Promise<LeadJob> {
  const account = await getAccount(uid);
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();

  const recent = await db().from("outreach_lead_jobs").select("requested, refunded, status").eq("user_uid", uid).gte("created_at", since).returns<Pick<JobRow, "requested" | "refunded" | "status">[]>();
  unavailable(recent.error);
  const rows = recent.data ?? [];
  if (rows.filter((r) => r.status === "calisiyor" || r.status === "aktariliyor").length >= MAX_OPEN_JOBS) throw new LeadSearchError("Devam eden aramalarınız bitsin, sonra yenisini başlatın.", 429);
  const usedToday = rows.reduce((n, r) => n + (r.status === "hata" ? 0 : r.requested - r.refunded), 0);
  if (usedToday + q.count > account.plan.dailyLeadCap) {
    throw new LeadSearchError(`Günlük arama sınırı: ${account.plan.dailyLeadCap} kişi. Bugün ${usedToday} kişi arattınız.`, 429);
  }
  if (q.count > account.credits) throw new InsufficientCreditsError(q.count, account.credits);

  await assertProviderBudget(estimateUsd(q.count));

  const created = await db().from("outreach_lead_jobs").insert({ user_uid: uid, query: q, requested: q.count }).select("*").single<JobRow>();
  unavailable(created.error);
  const job = created.data!;

  await spendCredits(uid, q.count, "arama", job.id);
  try {
    const params = new URLSearchParams({ maxTotalChargeUsd: String(Math.min(estimateUsd(q.count) * 1.5 + 0.01, 3)), timeout: "900" });
    const { data } = await apify<{ data: { id: string } }>(`/acts/${ACTOR}/runs?${params}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildActorInput(q)) });
    await db().from("outreach_lead_jobs").update({ apify_run_id: data.id }).eq("id", job.id);
    return toJob({ ...job, apify_run_id: data.id });
  } catch (e) {
    await refundCredits(uid, q.count, job.id).catch(() => undefined);
    await db().from("outreach_lead_jobs").update({ status: "hata", refunded: q.count, error: "Arama başlatılamadı.", finished_at: new Date().toISOString() }).eq("id", job.id);
    console.error("Kişi bulma başlatılamadı:", e instanceof Error ? e.message : e);
    throw new LeadSearchError("Arama şu an başlatılamadı. Krediniz iade edildi; biraz sonra tekrar deneyin.", 503);
  }
}

async function finish(job: JobRow, patch: Partial<JobRow>): Promise<JobRow> {
  const { data, error } = await db().from("outreach_lead_jobs").update({ ...patch, finished_at: new Date().toISOString() }).eq("id", job.id).select("*").single<JobRow>();
  unavailable(error);
  return data!;
}

export const listLabel = () => `Kişi bul · ${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(new Date())}`;

export type Skipped = LeadJob["skipped"];

/** Sağlayıcı kayıtlarını kişiye çevirir; e-postası olmayan, biçimi bozuk ve tekrar eden kayıtları ayıklar. */
export function parseLeads(items: Record<string, unknown>[], skipped: Skipped = {}): { leads: Lead[]; skipped: Skipped } {
  const bump = (k: keyof Skipped) => void (skipped[k] = (skipped[k] ?? 0) + 1);
  const leads: Lead[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const lead = mapLead(it);
    if (!lead) bump("epostasiz");
    else if (!isPlausibleEmail(lead.email)) bump("gecersiz");
    else if (seen.has(lead.email)) bump("yinelenen");
    else {
      seen.add(lead.email);
      leads.push(lead);
    }
  }
  return { leads, skipped };
}

/** Kullanıcının zaten kayıtlı e-postaları (verilen adaylar arasında). */
export async function existingEmails(uid: string, emails: string[]): Promise<Set<string>> {
  const existing = new Set<string>();
  for (let i = 0; i < emails.length; i += 100) {
    const { data, error } = await db().from("outreach_contacts").select("email").eq("user_uid", uid).in("email", emails.slice(i, i + 100)).returns<{ email: string }[]>();
    unavailable(error);
    for (const r of data ?? []) existing.add(r.email.toLowerCase());
  }
  return existing;
}

/** Kayıtlı kişilerin şirket başına sayısı (şirket başına sınır için kontenjandan düşer). */
export async function companyCounts(uid: string): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const mine = await db().from("outreach_contacts").select("email, company").eq("user_uid", uid).limit(maxContacts).returns<{ email: string | null; company: string | null }[]>();
  unavailable(mine.error);
  for (const c of mine.data ?? []) {
    const key = companyKey(c.email, c.company);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Eklenecek kişileri hazırlar (henüz yazmaz): zaten kayıtlı olanları, şirket başına sınırı, kara listeyi, geçersiz alan adlarını
 * ve kişi sınırını uygular. Dönen satır sayısı = düşülecek kredi.
 */
export async function prepareImport(uid: string, leads: Lead[], opts: { perCompany: number; skipped?: Skipped }): Promise<{ batch: Record<string, unknown>[]; skipped: Skipped }> {
  const skipped: Skipped = opts.skipped ?? {};
  const bump = (k: keyof Skipped) => void (skipped[k] = (skipped[k] ?? 0) + 1);

  const existing = await existingEmails(uid, leads.map((l) => l.email));
  const fresh = leads.filter((l) => !existing.has(l.email));
  for (let i = 0; i < leads.length - fresh.length; i++) bump("yinelenen");

  const counts = opts.perCompany > 0 ? await companyCounts(uid) : new Map<string, number>();
  const { kept, dropped } = limitPerCompany(fresh, opts.perCompany, counts);
  for (let i = 0; i < dropped.length; i++) bump("ayni_sirket");

  const sup = await suppressionSets(uid);
  let room = maxContacts - (await countContacts(uid));
  const batch: Record<string, unknown>[] = [];
  for (const l of kept) {
    if (isSuppressedIn(sup, l.email)) {
      bump("kara_liste");
      continue;
    }
    const domain = emailDomain(l.email);
    const status = statusFor({ dns: await checkMailDns(domain), disposable: isDisposable(domain), origin: "site" });
    if (status === "gecersiz") {
      bump("gecersiz");
      continue;
    }
    if (room <= 0) {
      bump("kisi_siniri");
      continue;
    }
    room--;
    batch.push({
      user_uid: uid,
      name: l.name,
      company: l.company,
      email: l.email,
      email_status: status,
      email_kind: classifyEmail(l.email),
      website: l.website,
      city: l.city,
      job_title: l.jobTitle,
      linkedin_url: l.linkedinUrl,
      source: "kisi_bul",
      source_url: l.linkedinUrl,
      found_at: new Date().toISOString(),
    });
  }
  return { batch, skipped };
}

/** Hazırlanan kişileri yazar ve bir listeye koyar (verilen listeye ya da otomatik oluşturulan yeni listeye). */
export async function insertLeads(uid: string, batch: Record<string, unknown>[], opts: { tag: string; listId?: string | null }): Promise<{ added: number; listName: string | null }> {
  if (batch.length === 0) return { added: 0, listName: null };
  const ins = await db().from("outreach_contacts").insert(batch).select("id");
  unavailable(ins.error);
  const ids = (ins.data ?? []).map((r: { id: string }) => r.id);
  try {
    if (opts.listId) {
      await addToList(uid, opts.listId, ids);
      const l = await db().from("outreach_lists").select("name").eq("user_uid", uid).eq("id", opts.listId).maybeSingle<{ name: string }>();
      return { added: batch.length, listName: l.data?.name ?? null };
    }
    // Sonuçlar kendi listesine konur: tek tıkla kampanyaya eklenebilsin.
    const base = listLabel();
    const list = await createList(uid, base).catch(async (e) => {
      if (e instanceof DuplicateContactError) return createList(uid, `${base} (${opts.tag.slice(0, 4)})`);
      throw e;
    });
    await addToList(uid, list.id, ids);
    return { added: batch.length, listName: list.name };
  } catch {
    return { added: batch.length, listName: null };
  }
}

async function importLeads(job: JobRow, items: Record<string, unknown>[]): Promise<{ added: number; skipped: Skipped; listName: string | null }> {
  const parsed = parseLeads(items);
  const { batch, skipped } = await prepareImport(job.user_uid, parsed.leads, { perCompany: job.query.perCompany ?? 0, skipped: parsed.skipped });
  const { added, listName } = await insertLeads(job.user_uid, batch, { tag: job.id });
  return { added, skipped, listName };
}

/**
 * Bir işin sağlayıcı koşusu bittiyse sonuçları aktarır ve krediyi kesinleştirir. Birden çok kez (istemci yoklaması, zamanlayıcı)
 * çağrılabilir: `aktariliyor` durumuna geçişi tek bir çağrı kazanır.
 */
export async function finalizeLeadJob(job: JobRow): Promise<{ job: JobRow; listName: string | null }> {
  if (job.status !== "calisiyor" || !job.apify_run_id) return { job, listName: null };

  const { data: run } = await apify<{ data: { status: string; defaultDatasetId: string } }>(`/actor-runs/${encodeURIComponent(job.apify_run_id)}`);
  if (RUNNING.has(run.status)) return { job, listName: null };

  const claim = await db().from("outreach_lead_jobs").update({ status: "aktariliyor" }).eq("id", job.id).eq("status", "calisiyor").select("id");
  unavailable(claim.error);
  if (!claim.data?.length) return { job, listName: null };

  if (run.status !== "SUCCEEDED") {
    await refundCredits(job.user_uid, job.requested, job.id);
    return { job: await finish(job, { status: "hata", refunded: job.requested, error: "Arama tamamlanamadı. Krediniz iade edildi." }), listName: null };
  }

  try {
    const items = await apify<Record<string, unknown>[]>(`/datasets/${run.defaultDatasetId}/items?limit=${job.requested}&clean=true`);
    const found = items.length;
    const { added, skipped, listName } = await importLeads(job, items);
    const refund = job.requested - added;
    await refundCredits(job.user_uid, refund, job.id);
    return { job: await finish(job, { status: "bitti", found, added, refunded: refund, skipped, list_name: listName }), listName };
  } catch (e) {
    console.error("Kişi bulma sonuçları aktarılamadı:", e instanceof Error ? e.message : e);
    await refundCredits(job.user_uid, job.requested, job.id).catch(() => undefined);
    return { job: await finish(job, { status: "hata", refunded: job.requested, error: "Sonuçlar aktarılamadı. Krediniz iade edildi." }), listName: null };
  }
}

export async function getLeadJob(uid: string, id: string): Promise<LeadJob | null> {
  const { data, error } = await db().from("outreach_lead_jobs").select("*").eq("user_uid", uid).eq("id", id).maybeSingle<JobRow>();
  unavailable(error);
  if (!data) return null;
  return toJob((await finalizeLeadJob(data)).job);
}

export async function listLeadJobs(uid: string, limit = 10): Promise<LeadJob[]> {
  const { data, error } = await db().from("outreach_lead_jobs").select("*").eq("user_uid", uid).order("created_at", { ascending: false }).limit(limit).returns<JobRow[]>();
  unavailable(error);
  return (data ?? []).map((r) => toJob(r));
}

/** Zamanlayıcı: tarayıcı kapansa bile biten işlerin sonuçlarını aktarır; takılı kalan işleri iade ederek kapatır. */
export async function finalizeOpenLeadJobs(limit = 10): Promise<number> {
  const { data, error } = await db().from("outreach_lead_jobs").select("*").in("status", ["calisiyor", "aktariliyor"]).order("created_at", { ascending: true }).limit(limit).returns<JobRow[]>();
  unavailable(error);
  let done = 0;
  for (const j of data ?? []) {
    const age = Date.now() - Date.parse(j.created_at);
    try {
      if (j.status === "calisiyor") {
        const r = await finalizeLeadJob(j);
        if (r.job.status !== "calisiyor") done++;
        else if (age > 45 * 60_000) {
          await refundCredits(j.user_uid, j.requested, j.id);
          await finish(j, { status: "hata", refunded: j.requested, error: "Arama zaman aşımına uğradı. Krediniz iade edildi." });
          done++;
        }
      } else if (age > 15 * 60_000) {
        // Aktarım sırasında süreç kesildi: kullanıcı aleyhine kalmaması için tamamı iade edilir.
        await refundCredits(j.user_uid, j.requested, j.id);
        await finish(j, { status: "hata", refunded: j.requested, error: "Aktarım yarım kaldı. Krediniz iade edildi." });
        done++;
      }
    } catch (e) {
      console.error("Kişi bulma işi kapatılamadı:", e instanceof Error ? e.message : e);
    }
  }
  return done;
}
