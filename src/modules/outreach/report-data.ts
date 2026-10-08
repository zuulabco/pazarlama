import "server-only";
import { db } from "@/lib/supabase/server";
import { OutreachUnavailableError } from "./contacts";
import { buildReport, type EnrollLite, type MsgLite, type SequenceReport } from "./report";
import type { Sequence } from "./sequence-schema";

export type ActivityItem = {
  id: string;
  kind: string;
  at: string;
  meta: Record<string, unknown>;
  contact: { name: string | null; company: string | null; email: string | null } | null;
};

const unavailable = (e: { code?: string; message: string } | null) => {
  if (!e) return;
  if (e.code === "42P01" || e.code === "PGRST205") throw new OutreachUnavailableError();
  throw new Error(e.message);
};

export async function loadReport(uid: string, seq: Sequence): Promise<SequenceReport> {
  const [msgs, enr] = await Promise.all([
    db().from("outreach_messages").select("step_id, variant_key, status, replied_at, open_count, click_count, sent_at").eq("user_uid", uid).eq("sequence_id", seq.id).limit(100_000).returns<MsgLite[]>(),
    db().from("outreach_enrollments").select("status, finish_reason").eq("user_uid", uid).eq("sequence_id", seq.id).limit(100_000).returns<EnrollLite[]>(),
  ]);
  unavailable(msgs.error);
  unavailable(enr.error);
  return buildReport(seq.steps, msgs.data ?? [], enr.data ?? []);
}

export async function loadActivity(uid: string, sequenceId: string, limit = 60): Promise<ActivityItem[]> {
  const { data, error } = await db()
    .from("outreach_events")
    .select("id, kind, created_at, meta, outreach_contacts(name, company, email)")
    .eq("user_uid", uid)
    .eq("sequence_id", sequenceId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<{ id: string; kind: string; created_at: string; meta: Record<string, unknown> | null; outreach_contacts: ActivityItem["contact"] }[]>();
  unavailable(error);
  return (data ?? []).map((e) => ({ id: e.id, kind: e.kind, at: e.created_at, meta: e.meta ?? {}, contact: e.outreach_contacts }));
}
