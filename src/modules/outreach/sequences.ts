import "server-only";
import { db } from "@/lib/supabase/server";
import { OutreachUnavailableError } from "./contacts";
import { defaultSchedule, type Schedule } from "./schedule";
import { blankVariant, defaultSettings, maxSteps, type Sequence, type SequenceSettings, type SequenceStatus, type SequenceSummary, type Step, type Variant } from "./sequence-schema";

type DbError = { code?: string; message: string };
function check(what: string, error: DbError | null) {
  if (!error) return;
  if (error.code === "42P01" || error.code === "PGRST205" || error.code === "42883" || error.code === "PGRST202") throw new OutreachUnavailableError();
  throw new Error(`${what}: ${error.message}`);
}

/** Kullanıcı başına en çok bu kadar kampanya. */
export const maxSequences = 50;

type SeqRow = {
  id: string;
  name: string;
  description: string;
  status: SequenceStatus;
  paused_reason: string | null;
  schedule: Schedule | null;
  settings: Partial<SequenceSettings> | null;
  created_at: string;
  updated_at: string;
};
type StepRow = { id: string; sequence_id: string; position: number; kind: Step["kind"]; delay_minutes: number; enabled: boolean; variants: Variant[] | null; task: Step["task"] | null };

const seqColumns = "id, name, description, status, paused_reason, schedule, settings, created_at, updated_at";
const stepColumns = "id, sequence_id, position, kind, delay_minutes, enabled, variants, task";

const toSequence = (r: SeqRow, steps: Step[] = []): Sequence => ({
  id: r.id,
  name: r.name,
  description: r.description,
  status: r.status,
  pausedReason: r.paused_reason,
  schedule: { ...defaultSchedule, ...(r.schedule ?? {}) },
  settings: { ...defaultSettings, ...(r.settings ?? {}) },
  steps,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toStep = (r: StepRow): Step => ({
  id: r.id,
  position: r.position,
  kind: r.kind,
  delayMinutes: r.delay_minutes,
  enabled: r.enabled,
  variants: r.variants && r.variants.length > 0 ? r.variants : [blankVariant()],
  task: r.task ?? { title: "", notes: "" },
});

export async function listSequences(uid: string): Promise<SequenceSummary[]> {
  const { data, error } = await db().from("outreach_sequences").select(seqColumns).eq("user_uid", uid).neq("status", "arsiv").order("created_at", { ascending: false }).returns<SeqRow[]>();
  check("Kampanyalar okunamadı", error);
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [steps, enrollments, messages] = await Promise.all([
    db().from("outreach_steps").select("sequence_id").in("sequence_id", ids).returns<{ sequence_id: string }[]>(),
    db().from("outreach_enrollments").select("sequence_id, status").eq("user_uid", uid).in("sequence_id", ids).limit(20000).returns<{ sequence_id: string; status: string }[]>(),
    db().from("outreach_messages").select("sequence_id, status, replied_at").eq("user_uid", uid).in("sequence_id", ids).limit(50000).returns<{ sequence_id: string; status: string; replied_at: string | null }[]>(),
  ]);
  check("Adımlar okunamadı", steps.error);
  check("Kişiler okunamadı", enrollments.error);
  check("Gönderimler okunamadı", messages.error);

  return rows.map((r) => {
    const mine = (x: { sequence_id: string }) => x.sequence_id === r.id;
    const en = (enrollments.data ?? []).filter(mine);
    const ms = (messages.data ?? []).filter(mine);
    return {
      ...toSequence(r),
      stepCount: (steps.data ?? []).filter(mine).length,
      enrolled: en.length,
      active: en.filter((e) => e.status === "aktif").length,
      sent: ms.filter((m) => m.status !== "hata").length,
      replied: ms.filter((m) => m.replied_at).length,
      bounced: ms.filter((m) => m.status === "bounce").length,
    };
  });
}

export async function getSequence(uid: string, id: string): Promise<Sequence | null> {
  const { data, error } = await db().from("outreach_sequences").select(seqColumns).eq("user_uid", uid).eq("id", id).maybeSingle<SeqRow>();
  check("Kampanya okunamadı", error);
  if (!data) return null;
  const steps = await db().from("outreach_steps").select(stepColumns).eq("sequence_id", id).order("position", { ascending: true }).returns<StepRow[]>();
  check("Adımlar okunamadı", steps.error);
  return toSequence(data, (steps.data ?? []).map(toStep));
}

export async function createSequence(uid: string, input: { name: string; description?: string; steps?: Omit<Step, "id" | "position">[] }): Promise<Sequence> {
  const { count: n } = await db().from("outreach_sequences").select("id", { count: "exact", head: true }).eq("user_uid", uid).neq("status", "arsiv");
  if ((n ?? 0) >= maxSequences) throw new Error(`En fazla ${maxSequences} kampanya oluşturabilirsiniz.`);
  const { data, error } = await db()
    .from("outreach_sequences")
    .insert({ user_uid: uid, name: input.name, description: input.description ?? "", schedule: defaultSchedule, settings: defaultSettings })
    .select(seqColumns)
    .single<SeqRow>();
  check("Kampanya oluşturulamadı", error);
  const seq = toSequence(data!);
  if (input.steps?.length) return (await replaceSteps(uid, seq.id, input.steps.slice(0, maxSteps))) ?? seq;
  return seq;
}

/**
 * Adımları verilen sırayla yazar: kimliği olanlar güncellenir (günlük kayıtları adıma bağlı kalır), olmayanlar eklenir,
 * gönderilmeyenler silinir. Sıra `position` ile saklanır.
 */
export async function replaceSteps(uid: string, sequenceId: string, steps: (Omit<Step, "id" | "position"> & { id?: string })[]): Promise<Sequence | null> {
  const seq = await db().from("outreach_sequences").select("id").eq("user_uid", uid).eq("id", sequenceId).maybeSingle();
  check("Kampanya okunamadı", seq.error);
  if (!seq.data) return null;

  const existing = await db().from("outreach_steps").select("id").eq("sequence_id", sequenceId).returns<{ id: string }[]>();
  check("Adımlar okunamadı", existing.error);
  const have = new Set((existing.data ?? []).map((s) => s.id));
  const keep = new Set(steps.flatMap((s) => (s.id && have.has(s.id) ? [s.id] : [])));

  const stale = [...have].filter((id) => !keep.has(id));
  if (stale.length > 0) {
    const del = await db().from("outreach_steps").delete().eq("sequence_id", sequenceId).in("id", stale);
    check("Adımlar silinemedi", del.error);
  }
  if (steps.length > 0) {
    const rows = steps.map((s, i) => ({
      ...(s.id && have.has(s.id) ? { id: s.id } : {}),
      sequence_id: sequenceId,
      user_uid: uid,
      position: i,
      kind: s.kind,
      delay_minutes: s.delayMinutes,
      enabled: s.enabled,
      variants: s.variants,
      task: s.task,
    }));
    const up = await db().from("outreach_steps").upsert(rows, { onConflict: "id" });
    check("Adımlar kaydedilemedi", up.error);
  }
  return getSequence(uid, sequenceId);
}

export async function updateSequence(
  uid: string,
  id: string,
  patch: { name?: string; description?: string; schedule?: Schedule; settings?: SequenceSettings; steps?: (Omit<Step, "id" | "position"> & { id?: string })[] },
): Promise<Sequence | null> {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.schedule !== undefined) update.schedule = patch.schedule;
  if (patch.settings !== undefined) update.settings = patch.settings;
  if (Object.keys(update).length > 0) {
    const { data, error } = await db().from("outreach_sequences").update(update).eq("user_uid", uid).eq("id", id).select("id").maybeSingle();
    check("Kampanya güncellenemedi", error);
    if (!data) return null;
  }
  if (patch.steps !== undefined) return replaceSteps(uid, id, patch.steps);
  return getSequence(uid, id);
}

export async function setSequenceStatus(uid: string, id: string, status: SequenceStatus, reason: string | null = null): Promise<Sequence | null> {
  const { data, error } = await db().from("outreach_sequences").update({ status, paused_reason: reason }).eq("user_uid", uid).eq("id", id).select("id").maybeSingle();
  check("Kampanya durumu güncellenemedi", error);
  return data ? getSequence(uid, id) : null;
}

export async function deleteSequence(uid: string, id: string) {
  const { error } = await db().from("outreach_sequences").delete().eq("user_uid", uid).eq("id", id);
  check("Kampanya silinemedi", error);
}

/** Kampanyayı (adımlarıyla) taslak olarak çoğaltır; kişiler ve günlük kopyalanmaz. */
export async function duplicateSequence(uid: string, id: string): Promise<Sequence | null> {
  const src = await getSequence(uid, id);
  if (!src) return null;
  const copy = await createSequence(uid, { name: `${src.name} (kopya)`.slice(0, 80), description: src.description, steps: src.steps.map((s) => ({ kind: s.kind, delayMinutes: s.delayMinutes, enabled: s.enabled, variants: s.variants, task: s.task })) });
  return updateSequence(uid, copy.id, { schedule: src.schedule, settings: { ...src.settings, mailboxIds: [] } });
}
