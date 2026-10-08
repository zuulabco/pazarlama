import "server-only";
import { db } from "@/lib/supabase/server";
import { OutreachUnavailableError } from "./contacts";
import { buildOverview, groupBy, type GroupRow, type Overview, type REnroll, type RMsg } from "./report-overview";

export type ReportsData = {
  overview: Overview;
  campaigns: (GroupRow & { name: string; status: string })[];
  mailboxes: (GroupRow & { email: string; warmupScore: number | null; dnsScore: number | null })[];
};

const unavailable = (e: { code?: string; message: string } | null) => {
  if (!e) return;
  if (e.code === "42P01" || e.code === "PGRST205") throw new OutreachUnavailableError();
  throw new Error(e.message);
};

export const rangeOptions = [7, 30, 90] as const;

/** Genel raporlar: yalnızca otomasyon e-postaları sayılır (yanıtlar, ısındırma ve test e-postaları hariç). */
export async function loadReports(uid: string, days: number): Promise<ReportsData> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const [msgs, enrolls, unsub, seqs, boxes] = await Promise.all([
    db().from("outreach_messages").select("sent_at, status, replied_at, sequence_id, mailbox_id").eq("user_uid", uid).gte("sent_at", since).limit(50_000).returns<RMsg[]>(),
    db().from("outreach_enrollments").select("sequence_id, mailbox_id, lead_status, last_reply_at").eq("user_uid", uid).gte("last_reply_at", since).limit(20_000).returns<REnroll[]>(),
    db().from("outreach_events").select("id", { count: "exact", head: true }).eq("user_uid", uid).eq("kind", "abonelik").gte("created_at", since),
    db().from("outreach_sequences").select("id, name, status").eq("user_uid", uid).returns<{ id: string; name: string; status: string }[]>(),
    db().from("outreach_mailboxes").select("id, email, warmup_score, dns_check").eq("user_uid", uid).returns<{ id: string; email: string; warmup_score: number | null; dns_check: { checks: { status: string }[] } | null }[]>(),
  ]);
  for (const r of [msgs, enrolls, unsub, seqs, boxes]) unavailable(r.error);

  const m = msgs.data ?? [];
  const e = enrolls.data ?? [];
  const seqName = new Map((seqs.data ?? []).map((s) => [s.id, s]));
  const boxInfo = new Map((boxes.data ?? []).map((b) => [b.id, b]));

  return {
    overview: buildOverview(m, e, unsub.count ?? 0, days),
    campaigns: groupBy(m, e, "sequence_id", days).map((r) => ({ ...r, name: seqName.get(r.id)?.name ?? "Silinmiş kampanya", status: seqName.get(r.id)?.status ?? "arsiv" })),
    mailboxes: groupBy(m, e, "mailbox_id", days).map((r) => {
      const b = boxInfo.get(r.id);
      const checks = b?.dns_check?.checks ?? [];
      return { ...r, email: b?.email ?? "Kaldırılmış adres", warmupScore: b?.warmup_score ?? null, dnsScore: checks.length ? Math.round((checks.filter((c) => c.status === "ok").length / checks.length) * 100) : null };
    }),
  };
}
