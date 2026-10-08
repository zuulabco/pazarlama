import "server-only";
import { finishLabels } from "./enrollment-labels";
export { finishLabels };
import { db } from "@/lib/supabase/server";
import { OutreachUnavailableError } from "./contacts";
import type { Sequence } from "./sequence-schema";

type DbError = { code?: string; message: string };
function check(what: string, error: DbError | null) {
  if (!error) return;
  if (error.code === "42P01" || error.code === "PGRST205" || error.code === "42883" || error.code === "PGRST202") throw new OutreachUnavailableError();
  throw new Error(`${what}: ${error.message}`);
}

export type EnrollmentStatus = "aktif" | "bitti" | "duraklatildi" | "hata";
export type FinishReason = "tamamlandi" | "yanit" | "abonelik" | "bounce" | "sikayet" | "tiklama" | "yanitsiz" | "elle" | "gecersiz" | "kara_liste" | "sirket";


export type Enrollment = {
  id: string;
  sequenceId: string;
  contactId: string;
  status: EnrollmentStatus;
  finishReason: FinishReason | null;
  currentStep: number;
  nextRunAt: string | null;
  mailboxId: string | null;
  threadRoot: string | null;
  lastMessageId: string | null;
  rootSubject: string | null;
  personalization: Record<string, string>;
  attempts: number;
  lastError: string | null;
  claimedUntil: string | null;
  createdAt: string;
};

export type EnrollmentRow = {
  id: string;
  sequence_id: string;
  contact_id: string;
  status: EnrollmentStatus;
  finish_reason: FinishReason | null;
  current_step: number;
  next_run_at: string | null;
  mailbox_id: string | null;
  thread_root: string | null;
  last_message_id: string | null;
  root_subject: string | null;
  personalization: Record<string, string> | null;
  attempts: number;
  last_error: string | null;
  claimed_until: string | null;
  created_at: string;
  user_uid: string;
};

export const toEnrollment = (r: EnrollmentRow): Enrollment => ({
  id: r.id,
  sequenceId: r.sequence_id,
  contactId: r.contact_id,
  status: r.status,
  finishReason: r.finish_reason,
  currentStep: r.current_step,
  nextRunAt: r.next_run_at,
  mailboxId: r.mailbox_id,
  threadRoot: r.thread_root,
  lastMessageId: r.last_message_id,
  rootSubject: r.root_subject,
  personalization: r.personalization ?? {},
  attempts: r.attempts,
  lastError: r.last_error,
  claimedUntil: r.claimed_until,
  createdAt: r.created_at,
});

export type EnrollmentView = Enrollment & {
  contact: { id: string; name: string | null; company: string | null; email: string | null; emailStatus: string; emailKind: string | null };
  sent: number;
  lastSentAt: string | null;
};

const columns = "id, user_uid, sequence_id, contact_id, status, finish_reason, current_step, next_run_at, mailbox_id, thread_root, last_message_id, root_subject, personalization, attempts, last_error, claimed_until, created_at";

export type EnrollResult = {
  added: number;
  skipped: { noEmail: number; invalid: number; personal: number; suppressed: number; exists: number; unknown: number };
};

/** Bir adresin kara listede olup olmadığına bakmak için kullanıcının kara listesi (adresler ve alan adları). */
export async function suppressionSets(uid: string): Promise<{ emails: Set<string>; domains: Set<string> }> {
  const { data, error } = await db().from("outreach_suppressions").select("email, domain").eq("user_uid", uid).limit(10000).returns<{ email: string | null; domain: string | null }[]>();
  check("Kara liste okunamadı", error);
  const emails = new Set<string>();
  const domains = new Set<string>();
  for (const s of data ?? []) {
    if (s.email) emails.add(s.email.toLowerCase());
    if (s.domain) domains.add(s.domain.toLowerCase());
  }
  return { emails, domains };
}

export const isSuppressedIn = (sets: { emails: Set<string>; domains: Set<string> }, email: string) => {
  const e = email.toLowerCase();
  return sets.emails.has(e) || sets.domains.has(e.slice(e.lastIndexOf("@") + 1));
};

/**
 * Kişileri kampanyaya ekler. Uygun olmayanlar (e-postası yok/geçersiz, kişisel adres ve izin yok, kara listede, zaten ekli)
 * atlanır ve nedenleri sayılarak döndürülür. İlk gönderim, ilk açık adımın gecikmesi kadar sonraya planlanır.
 */
export async function enrollContacts(uid: string, seq: Sequence, contactIds: string[]): Promise<EnrollResult> {
  const result: EnrollResult = { added: 0, skipped: { noEmail: 0, invalid: 0, personal: 0, suppressed: 0, exists: 0, unknown: 0 } };
  const ids = [...new Set(contactIds)].slice(0, 500);

  const contacts = await db().from("outreach_contacts").select("id, email, email_status, email_kind").eq("user_uid", uid).in("id", ids).returns<{ id: string; email: string | null; email_status: string; email_kind: string | null }[]>();
  check("Kişiler okunamadı", contacts.error);
  const found = new Map((contacts.data ?? []).map((c) => [c.id, c]));
  result.skipped.unknown = ids.filter((id) => !found.has(id)).length;

  const existing = await db().from("outreach_enrollments").select("contact_id").eq("sequence_id", seq.id).in("contact_id", ids).returns<{ contact_id: string }[]>();
  check("Kayıtlar okunamadı", existing.error);
  const already = new Set((existing.data ?? []).map((e) => e.contact_id));
  const sup = await suppressionSets(uid);

  const first = seq.steps.find((s) => s.enabled);
  const when = new Date(Date.now() + (first?.delayMinutes ?? 0) * 60_000).toISOString();

  const rows: Record<string, unknown>[] = [];
  for (const id of ids) {
    const c = found.get(id);
    if (!c) continue;
    if (already.has(id)) result.skipped.exists++;
    else if (!c.email) result.skipped.noEmail++;
    else if (c.email_status === "gecersiz") result.skipped.invalid++;
    else if (c.email_kind === "kisisel" && !seq.settings.allowPersonal) result.skipped.personal++;
    else if (isSuppressedIn(sup, c.email)) result.skipped.suppressed++;
    else rows.push({ user_uid: uid, sequence_id: seq.id, contact_id: id, status: "aktif", current_step: 0, next_run_at: when });
  }
  if (rows.length > 0) {
    const { error } = await db().from("outreach_enrollments").insert(rows);
    check("Kişiler kampanyaya eklenemedi", error);
  }
  result.added = rows.length;
  return result;
}

export async function listEnrollments(uid: string, sequenceId: string, opts: { page?: number; perPage?: number; status?: EnrollmentStatus | "hepsi" } = {}): Promise<{ items: EnrollmentView[]; total: number }> {
  const perPage = Math.min(opts.perPage ?? 25, 100);
  const page = Math.max(opts.page ?? 1, 1);
  let q = db()
    .from("outreach_enrollments")
    .select(`${columns}, outreach_contacts(id, name, company, email, email_status, email_kind)`, { count: "exact" })
    .eq("user_uid", uid)
    .eq("sequence_id", sequenceId);
  if (opts.status && opts.status !== "hepsi") q = q.eq("status", opts.status);
  const { data, count, error } = await q
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)
    .returns<(EnrollmentRow & { outreach_contacts: { id: string; name: string | null; company: string | null; email: string | null; email_status: string; email_kind: string | null } | null })[]>();
  check("Kayıtlar okunamadı", error);
  const rows = data ?? [];

  const msgs = rows.length
    ? await db().from("outreach_messages").select("enrollment_id, sent_at, status").in("enrollment_id", rows.map((r) => r.id)).returns<{ enrollment_id: string; sent_at: string; status: string }[]>()
    : { data: [], error: null };
  check("Gönderimler okunamadı", msgs.error);

  return {
    total: count ?? 0,
    items: rows.map((r) => {
      const mine = (msgs.data ?? []).filter((m) => m.enrollment_id === r.id && m.status !== "hata");
      const c = r.outreach_contacts;
      return {
        ...toEnrollment(r),
        contact: { id: c?.id ?? r.contact_id, name: c?.name ?? null, company: c?.company ?? null, email: c?.email ?? null, emailStatus: c?.email_status ?? "yok", emailKind: c?.email_kind ?? null },
        sent: mine.length,
        lastSentAt: mine.map((m) => m.sent_at).sort().at(-1) ?? null,
      };
    }),
  };
}

export async function removeEnrollments(uid: string, sequenceId: string, ids: string[]) {
  const { error } = await db().from("outreach_enrollments").delete().eq("user_uid", uid).eq("sequence_id", sequenceId).in("id", ids);
  check("Kişiler çıkarılamadı", error);
}

/** Kişileri duraklatır ya da sürdürür (sürdürülenler hemen sıraya girer). */
export async function setEnrollmentsPaused(uid: string, sequenceId: string, ids: string[], paused: boolean) {
  const patch = paused ? { status: "duraklatildi" } : { status: "aktif", next_run_at: new Date().toISOString(), finish_reason: null };
  const { error } = await db().from("outreach_enrollments").update(patch).eq("user_uid", uid).eq("sequence_id", sequenceId).in("id", ids).in("status", paused ? ["aktif"] : ["duraklatildi", "hata"]);
  check("Kişiler güncellenemedi", error);
}

/** Bir kişinin tüm etkin kayıtlarını bitirir (abonelik, bounce, şikâyet gibi kişi bazlı nedenler). */
export async function finishContactEnrollments(uid: string, contactId: string, reason: FinishReason) {
  const { error } = await db()
    .from("outreach_enrollments")
    .update({ status: "bitti", finish_reason: reason, next_run_at: null, claimed_until: null })
    .eq("user_uid", uid)
    .eq("contact_id", contactId)
    .in("status", ["aktif", "duraklatildi", "hata"]);
  check("Kişi kayıtları bitirilemedi", error);
}

/** Zamanlayıcı için: vadesi gelen kayıtları atomik olarak kilitler (başka bir çalıştırma aynı kaydı almaz). */
export async function claimDue(batch: number, leaseSeconds = 90): Promise<EnrollmentRow[]> {
  const { data, error } = await db().rpc("claim_outreach_enrollments", { batch, lease_seconds: leaseSeconds });
  check("Kayıtlar kilitlenemedi", error);
  return (data ?? []) as EnrollmentRow[];
}

export async function updateEnrollment(id: string, patch: Record<string, unknown>) {
  const { error } = await db().from("outreach_enrollments").update(patch).eq("id", id);
  check("Kayıt güncellenemedi", error);
}

export async function addEvent(e: { uid: string; kind: string; sequenceId?: string | null; enrollmentId?: string | null; messageRowId?: string | null; contactId?: string | null; meta?: Record<string, unknown> }) {
  const { error } = await db().from("outreach_events").insert({
    user_uid: e.uid,
    kind: e.kind,
    sequence_id: e.sequenceId ?? null,
    enrollment_id: e.enrollmentId ?? null,
    message_row_id: e.messageRowId ?? null,
    contact_id: e.contactId ?? null,
    meta: e.meta ?? {},
  });
  check("Olay kaydedilemedi", error);
}
