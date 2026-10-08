import "server-only";
import { db } from "@/lib/supabase/server";
import { OutreachUnavailableError } from "./contacts";
import type { HomeFacts } from "./home-rules";
import { loadReports, type ReportsData } from "./reports";
import { accountSummary, type AccountSummary } from "./usage";

export type HomeData = {
  facts: HomeFacts;
  reports: ReportsData;
  account: AccountSummary;
  pipeline: { contacts: number; inCampaign: number; replies: number; meetings: number };
  customer: { tracked: number; upcoming: { id: string; title: string; kind: string; startsAt: string; withName: string | null }[] };
};

const check = (e: { code?: string; message: string } | null) => {
  if (!e) return;
  if (e.code === "42P01" || e.code === "PGRST205") throw new OutreachUnavailableError();
  throw new Error(e.message);
};

/** Ana sayfa verisi: otomasyon hattı (kişi → kampanya → yanıt → toplantı), dikkat gerektirenler ve yerel müşteri özeti. */
export async function loadHome(uid: string): Promise<HomeData> {
  const [reports, account, contacts, boxes, seqs, active, replied, tracked, plan] = await Promise.all([
    loadReports(uid, 30),
    accountSummary(uid),
    db().from("outreach_contacts").select("id", { count: "exact", head: true }).eq("user_uid", uid),
    db().from("outreach_mailboxes").select("email, status, warmup_enabled").eq("user_uid", uid).returns<{ email: string; status: string; warmup_enabled: boolean }[]>(),
    db().from("outreach_sequences").select("id", { count: "exact", head: true }).eq("user_uid", uid).neq("status", "arsiv"),
    db().from("outreach_enrollments").select("id", { count: "exact", head: true }).eq("user_uid", uid).eq("status", "aktif"),
    db().from("outreach_enrollments").select("last_reply_at, read_at").eq("user_uid", uid).not("last_reply_at", "is", null).limit(1000).returns<{ last_reply_at: string; read_at: string | null }[]>(),
    db().from("favorites").select("id", { count: "exact", head: true }).eq("user_uid", uid),
    db().from("plan_items").select("id, title, kind, starts_at, with_name").eq("user_uid", uid).eq("done", false).gte("starts_at", new Date().toISOString()).order("starts_at").limit(3).returns<{ id: string; title: string; kind: string; starts_at: string; with_name: string | null }[]>(),
  ]);
  for (const r of [contacts, boxes, seqs, active, replied]) check(r.error);

  const mailboxes = boxes.data ?? [];
  const unread = (replied.data ?? []).filter((e) => !e.read_at || Date.parse(e.read_at) < Date.parse(e.last_reply_at)).length;
  const totals = reports.overview.totals;

  return {
    reports,
    account,
    facts: {
      connectedMailboxes: mailboxes.filter((m) => m.status === "bagli").length,
      brokenMailboxes: mailboxes.filter((m) => m.status === "hata").map((m) => ({ email: m.email })),
      warmupOn: mailboxes.filter((m) => m.warmup_enabled).length,
      contacts: contacts.count ?? 0,
      campaigns: seqs.count ?? 0,
      sent: totals.sent,
      replies: totals.replied,
      unread,
      bounceRate: reports.overview.rates.bounce,
      credits: account.credits,
    },
    pipeline: { contacts: contacts.count ?? 0, inCampaign: active.count ?? 0, replies: totals.replied, meetings: totals.meetings },
    customer: { tracked: tracked.count ?? 0, upcoming: (plan.data ?? []).map((p) => ({ id: p.id, title: p.title, kind: p.kind, startsAt: p.starts_at, withName: p.with_name })) },
  };
}
