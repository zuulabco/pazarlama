import "server-only";
import { db } from "@/lib/supabase/server";
import { getAccount } from "./account";
import { browseUsedToday } from "./lead-browse";
import { monthlyCapacity, type Plan } from "./plans";

export type AccountSummary = {
  plan: Plan;
  credits: number;
  senders: { used: number; limit: number };
  campaigns: { used: number; limit: number };
  /** Bugün kredi harcamadan listelenen kişi sayısı ve günlük hak. */
  browse: { used: number; limit: number };
  /** Paketin yaklaşık aylık gönderim kapasitesi (gönderici adresi sayısına göre). */
  monthlyCapacity: number;
  /** Son 24 saatte gönderilen e-posta ve bağlı gönderici adreslerinin toplam günlük limiti. */
  sending: { today: number; capacity: number };
};

/** Paket, kredi ve kullanım özeti (üst çubuk ve sınır uyarıları için). */
export async function accountSummary(uid: string): Promise<AccountSummary> {
  const account = await getAccount(uid);
  const [boxes, seqs, browsed, limits, sentToday] = await Promise.all([
    db().from("outreach_mailboxes").select("id", { count: "exact", head: true }).eq("user_uid", uid),
    db().from("outreach_sequences").select("id", { count: "exact", head: true }).eq("user_uid", uid).neq("status", "arsiv"),
    browseUsedToday(uid).catch(() => 0),
    db().from("outreach_mailboxes").select("daily_limit").eq("user_uid", uid).eq("status", "bagli").returns<{ daily_limit: number }[]>(),
    db().from("outreach_messages").select("id", { count: "exact", head: true }).eq("user_uid", uid).neq("status", "hata").gte("sent_at", new Date(Date.now() - 86_400_000).toISOString()),
  ]);
  return {
    plan: account.plan,
    credits: account.credits,
    senders: { used: boxes.count ?? 0, limit: account.plan.senders },
    campaigns: { used: seqs.count ?? 0, limit: account.plan.campaigns },
    browse: { used: browsed, limit: account.plan.browsePerDay },
    monthlyCapacity: monthlyCapacity(account.plan),
    sending: { today: sentToday.count ?? 0, capacity: (limits.data ?? []).reduce((n, m) => n + m.daily_limit, 0) },
  };
}
