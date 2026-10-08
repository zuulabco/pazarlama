import "server-only";
import { db } from "@/lib/supabase/server";
import { OutreachUnavailableError } from "./contacts";
import type { HomeFacts } from "./home-rules";
import { statusLabel, type LeadStatus } from "./unibox-options";
import { loadReports, type ReportsData } from "./reports";
import { accountSummary, type AccountSummary } from "./usage";

export type HomeData = {
  facts: HomeFacts;
  reports: ReportsData;
  account: AccountSummary;
  pipeline: { contacts: number; inCampaign: number; replies: number; meetings: number };
  /** Gönderici adresleri: durum, bugünkü gönderim, ısınma. */
  mailboxes: { id: string; email: string; status: string; sentToday: number; dailyLimit: number; warmup: { on: boolean; day: number; score: number | null } }[];
  /** Son yanıtlar (Gelen kutusunun özeti). */
  recentReplies: { id: string; name: string; company: string | null; subject: string; status: string; at: string; unread: boolean }[];
  activeCampaigns: number;
  customer: { tracked: number; upcoming: { id: string; title: string; kind: string; startsAt: string; withName: string | null }[] };
};

const check = (e: { code?: string; message: string } | null) => {
  if (!e) return;
  if (e.code === "42P01" || e.code === "PGRST205") throw new OutreachUnavailableError();
  throw new Error(e.message);
};

/** Ana sayfa verisi: otomasyon hattı (kişi → otomasyon → yanıt → toplantı), dikkat gerektirenler ve yerel müşteri özeti. */
export async function loadHome(uid: string): Promise<HomeData> {
  const [reports, account, contacts, boxes, seqs, active, replied, tracked, plan, today, recent, activeSeqs] = await Promise.all([
    loadReports(uid, 30),
    accountSummary(uid),
    db().from("outreach_contacts").select("id", { count: "exact", head: true }).eq("user_uid", uid),
    db().from("outreach_mailboxes").select("id, email, status, warmup_enabled, warmup_started_at, warmup_score, daily_limit").eq("user_uid", uid).returns<{ id: string; email: string; status: string; warmup_enabled: boolean; warmup_started_at: string | null; warmup_score: number | null; daily_limit: number }[]>(),
    db().from("outreach_sequences").select("id", { count: "exact", head: true }).eq("user_uid", uid).neq("status", "arsiv"),
    db().from("outreach_enrollments").select("id", { count: "exact", head: true }).eq("user_uid", uid).eq("status", "aktif"),
    db().from("outreach_enrollments").select("last_reply_at, read_at").eq("user_uid", uid).not("last_reply_at", "is", null).limit(1000).returns<{ last_reply_at: string; read_at: string | null }[]>(),
    db().from("favorites").select("id", { count: "exact", head: true }).eq("user_uid", uid),
    db().from("plan_items").select("id, title, kind, starts_at, with_name").eq("user_uid", uid).eq("done", false).gte("starts_at", new Date().toISOString()).order("starts_at").limit(3).returns<{ id: string; title: string; kind: string; starts_at: string; with_name: string | null }[]>(),
    db().from("outreach_messages").select("mailbox_id").eq("user_uid", uid).neq("status", "hata").gte("sent_at", new Date(Date.now() - 86_400_000).toISOString()).limit(5000).returns<{ mailbox_id: string | null }[]>(),
    db()
      .from("outreach_enrollments")
      .select("id, lead_status, last_reply_at, read_at, root_subject, outreach_contacts(name, company, email)")
      .eq("user_uid", uid)
      .not("last_reply_at", "is", null)
      .order("last_reply_at", { ascending: false })
      .limit(5)
      .returns<{ id: string; lead_status: LeadStatus; last_reply_at: string; read_at: string | null; root_subject: string | null; outreach_contacts: { name: string | null; company: string | null; email: string } | null }[]>(),
    db().from("outreach_sequences").select("id", { count: "exact", head: true }).eq("user_uid", uid).eq("status", "aktif"),
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
    activeCampaigns: activeSeqs.count ?? 0,
    mailboxes: mailboxes.map((m) => ({
      id: m.id,
      email: m.email,
      status: m.status,
      dailyLimit: m.daily_limit,
      sentToday: (today.data ?? []).filter((t) => t.mailbox_id === m.id).length,
      warmup: { on: m.warmup_enabled, day: m.warmup_started_at ? Math.floor((Date.now() - Date.parse(m.warmup_started_at)) / 86_400_000) + 1 : 0, score: m.warmup_score },
    })),
    recentReplies: (recent.data ?? []).map((e) => ({
      id: e.id,
      name: e.outreach_contacts?.name || e.outreach_contacts?.email || "Bilinmeyen kişi",
      company: e.outreach_contacts?.company ?? null,
      subject: e.root_subject ?? "",
      status: statusLabel(e.lead_status),
      at: e.last_reply_at,
      unread: !e.read_at || Date.parse(e.read_at) < Date.parse(e.last_reply_at),
    })),
    pipeline: { contacts: contacts.count ?? 0, inCampaign: active.count ?? 0, replies: totals.replied, meetings: totals.meetings },
    customer: { tracked: tracked.count ?? 0, upcoming: (plan.data ?? []).map((p) => ({ id: p.id, title: p.title, kind: p.kind, startsAt: p.starts_at, withName: p.with_name })) },
  };
}
