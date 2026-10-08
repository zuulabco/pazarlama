import "server-only";
import { db } from "@/lib/supabase/server";
import { classifyEmail } from "./discover/emails";
import type { CheckedCandidate } from "./discover/find";
import type { EmailStatus } from "./discover/verify-rules";
import { maxContacts, type Contact, type ContactInput, type ContactSource } from "./schema";

/** Otomasyon tabloları henüz oluşturulmadıysa (0007 migration'ı çalıştırılmadıysa) fırlatılır. */
export class OutreachUnavailableError extends Error {
  constructor() {
    super("Otomasyon tabloları bulunamadı. supabase/migrations/0007_outreach_contacts.sql çalıştırılmalı.");
  }
}

/** Aynı e-posta ya da aynı takipteki firma zaten kayıtlıysa. */
export class DuplicateContactError extends Error {
  constructor(message = "Bu e-posta adresi zaten kişilerinizde var.") {
    super(message);
  }
}

type DbError = { code?: string; message: string };

function check(what: string, error: DbError | null) {
  if (!error) return;
  if (error.code === "42P01" || error.code === "PGRST205") throw new OutreachUnavailableError();
  if (error.code === "23505") throw new DuplicateContactError();
  throw new Error(`${what}: ${error.message}`);
}

type Row = {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  email_status: EmailStatus;
  email_kind: Contact["emailKind"];
  phone: string | null;
  website: string | null;
  city: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  source: ContactSource;
  source_url: string | null;
  favorite_id: string | null;
  found_at: string | null;
  discovery_note: string | null;
  discovered_at: string | null;
  created_at: string;
};

const columns =
  "id, name, company, email, email_status, email_kind, phone, website, city, job_title, linkedin_url, source, source_url, favorite_id, found_at, discovery_note, discovered_at, created_at";

const toContact = (r: Row, lists: Contact["lists"] = []): Contact => ({
  id: r.id,
  name: r.name,
  company: r.company,
  email: r.email,
  emailStatus: r.email_status,
  emailKind: r.email_kind,
  phone: r.phone,
  website: r.website,
  city: r.city,
  jobTitle: r.job_title,
  linkedinUrl: r.linkedin_url,
  source: r.source,
  sourceUrl: r.source_url,
  favoriteId: r.favorite_id,
  foundAt: r.found_at,
  discoveryNote: r.discovery_note,
  discoveredAt: r.discovered_at,
  createdAt: r.created_at,
  lists,
});

/** PostgREST `or` filtresine girecek metinden ayraç karakterlerini temizler. */
const safeSearch = (q: string) => q.replace(/[,()%*\\]/g, " ").trim().slice(0, 80);

async function listsOf(uid: string, contactIds: string[]): Promise<Map<string, Contact["lists"]>> {
  const map = new Map<string, Contact["lists"]>();
  if (contactIds.length === 0) return map;
  const { data, error } = await db()
    .from("outreach_list_members")
    .select("contact_id, outreach_lists(id, name)")
    .eq("user_uid", uid)
    .in("contact_id", contactIds)
    .returns<{ contact_id: string; outreach_lists: { id: string; name: string } | null }[]>();
  check("Listeler okunamadı", error);
  for (const m of data ?? []) {
    if (!m.outreach_lists) continue;
    const arr = map.get(m.contact_id) ?? [];
    arr.push(m.outreach_lists);
    map.set(m.contact_id, arr);
  }
  return map;
}

export type ContactQuery = {
  search?: string;
  status?: EmailStatus | "hepsi";
  kind?: "is" | "rol" | "kisisel" | "hepsi";
  listId?: string | null;
  page?: number;
  perPage?: number;
};

export async function listContacts(uid: string, q: ContactQuery = {}): Promise<{ contacts: Contact[]; total: number }> {
  const perPage = Math.min(Math.max(q.perPage ?? 25, 1), 100);
  const page = Math.max(q.page ?? 1, 1);

  let ids: string[] | null = null;
  if (q.listId) {
    const members = await db().from("outreach_list_members").select("contact_id").eq("user_uid", uid).eq("list_id", q.listId).limit(maxContacts).returns<{ contact_id: string }[]>();
    check("Liste okunamadı", members.error);
    ids = (members.data ?? []).map((m) => m.contact_id);
    if (ids.length === 0) return { contacts: [], total: 0 };
  }

  let query = db().from("outreach_contacts").select(columns, { count: "exact" }).eq("user_uid", uid);
  if (ids) query = query.in("id", ids);
  if (q.status && q.status !== "hepsi") query = query.eq("email_status", q.status);
  if (q.kind && q.kind !== "hepsi") query = query.eq("email_kind", q.kind);
  const s = q.search ? safeSearch(q.search) : "";
  if (s) query = query.or(`name.ilike.%${s}%,company.ilike.%${s}%,email.ilike.%${s}%,city.ilike.%${s}%`);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)
    .returns<Row[]>();
  check("Kişiler okunamadı", error);

  const rows = data ?? [];
  const lists = await listsOf(uid, rows.map((r) => r.id));
  return { contacts: rows.map((r) => toContact(r, lists.get(r.id))), total: count ?? 0 };
}

export async function getContact(uid: string, id: string): Promise<Contact | null> {
  const { data, error } = await db().from("outreach_contacts").select(columns).eq("user_uid", uid).eq("id", id).maybeSingle<Row>();
  check("Kişi okunamadı", error);
  if (!data) return null;
  return toContact(data, (await listsOf(uid, [id])).get(id));
}

export async function countContacts(uid: string) {
  const { count, error } = await db().from("outreach_contacts").select("id", { count: "exact", head: true }).eq("user_uid", uid);
  check("Kişiler sayılamadı", error);
  return count ?? 0;
}

const emailFields = (email: string | null, status: EmailStatus) =>
  email ? { email, email_kind: classifyEmail(email), email_status: status } : { email: null, email_kind: null, email_status: "yok" as const };

export async function createContact(uid: string, input: ContactInput, source: ContactSource = "elle"): Promise<Contact> {
  if ((await countContacts(uid)) >= maxContacts) throw new Error(`En fazla ${maxContacts} kişi ekleyebilirsiniz.`);
  const { data, error } = await db()
    .from("outreach_contacts")
    .insert({
      user_uid: uid,
      name: input.name,
      company: input.company,
      phone: input.phone,
      website: input.website,
      city: input.city,
      source,
      ...emailFields(input.email, "elle"),
    })
    .select(columns)
    .single<Row>();
  check("Kişi eklenemedi", error);
  return toContact(data!);
}

/** Satırları ekler; zaten kayıtlı e-postaları atlar. Eklenen ve atlanan sayısını döndürür. */
export async function importContacts(uid: string, rows: ContactInput[], source: ContactSource): Promise<{ added: number; skipped: number }> {
  const room = maxContacts - (await countContacts(uid));
  if (room <= 0) throw new Error(`En fazla ${maxContacts} kişi ekleyebilirsiniz.`);

  const emails = rows.map((r) => r.email).filter((e): e is string => Boolean(e));
  const existing = new Set<string>();
  if (emails.length > 0) {
    const { data, error } = await db().from("outreach_contacts").select("email").eq("user_uid", uid).in("email", emails).returns<{ email: string }[]>();
    check("Kişiler okunamadı", error);
    for (const r of data ?? []) existing.add(r.email.toLowerCase());
  }

  const seen = new Set<string>();
  const fresh = rows.filter((r) => {
    if (!r.email) return true;
    if (existing.has(r.email) || seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });
  const batch = fresh.slice(0, room).map((r) => ({
    user_uid: uid,
    name: r.name,
    company: r.company,
    phone: r.phone,
    website: r.website,
    city: r.city,
    source,
    ...emailFields(r.email, "elle"),
  }));
  if (batch.length > 0) {
    const { error } = await db().from("outreach_contacts").insert(batch);
    check("Kişiler eklenemedi", error);
  }
  return { added: batch.length, skipped: rows.length - batch.length };
}

/** Takipteki firmaları kişi olarak ekler (zaten ekli olanlar atlanır). Takipte e-posta yazılıysa o kullanılır. */
export async function importFavorites(uid: string): Promise<{ added: number; skipped: number }> {
  const favs = await db()
    .from("favorites")
    .select("id, name, city, phone, website, email")
    .eq("user_uid", uid)
    .limit(2000)
    .returns<{ id: string; name: string; city: string | null; phone: string | null; website: string | null; email: string | null }[]>();
  check("Takip listesi okunamadı", favs.error);
  const all = favs.data ?? [];
  if (all.length === 0) return { added: 0, skipped: 0 };

  const existing = await db().from("outreach_contacts").select("favorite_id, email").eq("user_uid", uid).not("favorite_id", "is", null).returns<{ favorite_id: string; email: string | null }[]>();
  check("Kişiler okunamadı", existing.error);
  const have = new Set((existing.data ?? []).map((r) => r.favorite_id));

  const room = maxContacts - (await countContacts(uid));
  const taken = new Set<string>();
  const batch = all
    .filter((f) => !have.has(f.id))
    .map((f): Record<string, unknown> => {
      const raw = f.email?.trim().toLowerCase() || null;
      // Aynı e-posta iki firmada yazılmışsa ikincisine e-posta yazılmaz (benzersizlik).
      const email = raw && !taken.has(raw) ? raw : null;
      if (email) taken.add(email);
      return {
        user_uid: uid,
        company: f.name,
        city: f.city,
        phone: f.phone,
        website: f.website,
        source: "takip" as const,
        favorite_id: f.id,
        ...emailFields(email, "elle"),
      };
    })
    .slice(0, Math.max(room, 0));

  if (batch.length > 0) {
    // Takipte e-posta olan firma başka bir kişide zaten varsa çakışır; bu yüzden tek tek değil, çakışanları eleyerek ekleriz.
    const { error } = await db().from("outreach_contacts").insert(batch);
    if (error?.code === "23505") {
      let added = 0;
      for (const row of batch) {
        const one = await db().from("outreach_contacts").insert(row);
        if (!one.error) added++;
        else if (one.error.code === "23505") {
          const retry = await db().from("outreach_contacts").insert({ ...row, ...emailFields(null, "yok") });
          if (!retry.error) added++;
        } else check("Kişi eklenemedi", one.error);
      }
      return { added, skipped: all.length - added };
    }
    check("Kişiler eklenemedi", error);
  }
  return { added: batch.length, skipped: all.length - batch.length };
}

export async function updateContact(uid: string, id: string, patch: Partial<ContactInput>): Promise<Contact | null> {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.company !== undefined) update.company = patch.company;
  if (patch.phone !== undefined) update.phone = patch.phone;
  if (patch.website !== undefined) update.website = patch.website;
  if (patch.city !== undefined) update.city = patch.city;
  if (patch.email !== undefined) {
    Object.assign(update, emailFields(patch.email, "elle"));
    update.source_url = null;
    update.found_at = null;
  }
  if (Object.keys(update).length === 0) return getContact(uid, id);
  const { data, error } = await db().from("outreach_contacts").update(update).eq("user_uid", uid).eq("id", id).select(columns).maybeSingle<Row>();
  check("Kişi güncellenemedi", error);
  return data ? toContact(data, (await listsOf(uid, [id])).get(id)) : null;
}

/**
 * Site taramasının sonucunu kişiye yazar. Kullanıcının elle yazdığı e-postanın üzerine yazılmaz; yalnızca adres yoksa ya da
 * önceki adres geçersiz/doğrulanamamışsa en iyi aday atanır. Bulunamadıysa not düşülür.
 */
export async function applyDiscovery(uid: string, id: string, found: { best: CheckedCandidate | null; note: string }): Promise<Contact | null> {
  const current = await getContact(uid, id);
  if (!current) return null;

  const patch: Record<string, unknown> = { discovered_at: new Date().toISOString(), discovery_note: found.note.slice(0, 200) };
  const replaceable = !current.email || current.emailStatus === "gecersiz" || current.emailStatus === "riskli" || current.emailStatus === "yok";
  if (found.best && replaceable) {
    Object.assign(patch, {
      email: found.best.email,
      email_status: found.best.status,
      email_kind: found.best.kind,
      source_url: found.best.sourceUrl.slice(0, 500),
      found_at: new Date().toISOString(),
    });
  }
  const { data, error } = await db().from("outreach_contacts").update(patch).eq("user_uid", uid).eq("id", id).select(columns).maybeSingle<Row>();
  // Aynı e-posta başka bir kişide varsa benzersizlik çakışır: adres atanmaz, yalnızca not düşülür.
  if (error?.code === "23505") {
    await db().from("outreach_contacts").update({ discovered_at: patch.discovered_at, discovery_note: "Bu e-posta başka bir kişide zaten kayıtlı." }).eq("user_uid", uid).eq("id", id);
    return getContact(uid, id);
  }
  check("Kişi güncellenemedi", error);
  return data ? toContact(data, current.lists) : null;
}

export async function deleteContacts(uid: string, ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await db().from("outreach_contacts").delete().eq("user_uid", uid).in("id", ids);
  check("Kişiler silinemedi", error);
}

// ─── Listeler ──────────────────────────────────────────────────────────────────

export type ContactList = { id: string; name: string; count: number };

export async function listLists(uid: string): Promise<ContactList[]> {
  const { data, error } = await db()
    .from("outreach_lists")
    .select("id, name, outreach_list_members(count)")
    .eq("user_uid", uid)
    .order("created_at", { ascending: true })
    .returns<{ id: string; name: string; outreach_list_members: { count: number }[] }[]>();
  check("Listeler okunamadı", error);
  return (data ?? []).map((l) => ({ id: l.id, name: l.name, count: l.outreach_list_members?.[0]?.count ?? 0 }));
}

export async function createList(uid: string, name: string): Promise<ContactList> {
  const { count } = await db().from("outreach_lists").select("id", { count: "exact", head: true }).eq("user_uid", uid);
  if ((count ?? 0) >= 50) throw new Error("En fazla 50 liste oluşturabilirsiniz.");
  const { data, error } = await db().from("outreach_lists").insert({ user_uid: uid, name }).select("id, name").single<{ id: string; name: string }>();
  if (error?.code === "23505") throw new DuplicateContactError("Bu adda bir liste zaten var.");
  check("Liste oluşturulamadı", error);
  return { ...data!, count: 0 };
}

export async function deleteList(uid: string, id: string) {
  const { error } = await db().from("outreach_lists").delete().eq("user_uid", uid).eq("id", id);
  check("Liste silinemedi", error);
}

/** Kişileri listeye ekler; yalnızca kullanıcıya ait liste ve kişiler işlenir. Eklenen sayıyı döndürür. */
export async function addToList(uid: string, listId: string, contactIds: string[]): Promise<number> {
  const list = await db().from("outreach_lists").select("id").eq("user_uid", uid).eq("id", listId).maybeSingle();
  check("Liste okunamadı", list.error);
  if (!list.data) return 0;
  const own = await db().from("outreach_contacts").select("id").eq("user_uid", uid).in("id", contactIds).returns<{ id: string }[]>();
  check("Kişiler okunamadı", own.error);
  const rows = (own.data ?? []).map((c) => ({ list_id: listId, contact_id: c.id, user_uid: uid }));
  if (rows.length === 0) return 0;
  const { error } = await db().from("outreach_list_members").upsert(rows, { onConflict: "list_id,contact_id", ignoreDuplicates: true });
  check("Listeye eklenemedi", error);
  return rows.length;
}

export async function removeFromList(uid: string, listId: string, contactIds: string[]) {
  const { error } = await db().from("outreach_list_members").delete().eq("user_uid", uid).eq("list_id", listId).in("contact_id", contactIds);
  check("Listeden çıkarılamadı", error);
}

// ─── Kara liste ────────────────────────────────────────────────────────────────

export type Suppression = { id: string; email: string | null; domain: string | null; reason: "abonelik" | "bounce" | "sikayet" | "elle"; createdAt: string };

export async function listSuppressions(uid: string): Promise<Suppression[]> {
  const { data, error } = await db()
    .from("outreach_suppressions")
    .select("id, email, domain, reason, created_at")
    .eq("user_uid", uid)
    .order("created_at", { ascending: false })
    .limit(2000)
    .returns<{ id: string; email: string | null; domain: string | null; reason: Suppression["reason"]; created_at: string }[]>();
  check("Kara liste okunamadı", error);
  return (data ?? []).map((s) => ({ id: s.id, email: s.email, domain: s.domain, reason: s.reason, createdAt: s.created_at }));
}

export async function addSuppression(uid: string, input: { email?: string; domain?: string; reason: Suppression["reason"] }) {
  const row: Record<string, unknown> = input.email ? { user_uid: uid, email: input.email.toLowerCase(), reason: input.reason } : { user_uid: uid, domain: input.domain!.toLowerCase(), reason: input.reason };
  const { error } = await db().from("outreach_suppressions").insert(row);
  if (error?.code === "23505") return; // zaten kara listede
  check("Kara listeye eklenemedi", error);
}

export async function removeSuppression(uid: string, id: string) {
  const { error } = await db().from("outreach_suppressions").delete().eq("user_uid", uid).eq("id", id);
  check("Kara listeden çıkarılamadı", error);
}

/** Bir adres kara listede mi (adresin kendisi ya da alan adı)? Kampanya göndericisi bunu kullanır. */
export async function isSuppressed(uid: string, email: string): Promise<boolean> {
  const e = email.toLowerCase();
  const domain = e.slice(e.lastIndexOf("@") + 1);
  const { data, error } = await db().from("outreach_suppressions").select("id").eq("user_uid", uid).or(`email.eq.${e},domain.eq.${domain}`).limit(1);
  check("Kara liste okunamadı", error);
  return (data?.length ?? 0) > 0;
}

/** Bir listedeki kişi kimlikleri (en çok `maxContacts`). */
export async function listMemberIds(uid: string, listId: string): Promise<string[]> {
  const { data, error } = await db().from("outreach_list_members").select("contact_id").eq("user_uid", uid).eq("list_id", listId).limit(maxContacts).returns<{ contact_id: string }[]>();
  check("Liste okunamadı", error);
  return (data ?? []).map((m) => m.contact_id);
}
