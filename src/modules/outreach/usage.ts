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
};

/** Paket, kredi ve kullanım özeti (üst çubuk ve sınır uyarıları için). */
export async function accountSummary(uid: string): Promise<AccountSummary> {
  const account = await getAccount(uid);
  const [boxes, seqs, browsed] = await Promise.all([
    db().from("outreach_mailboxes").select("id", { count: "exact", head: true }).eq("user_uid", uid),
    db().from("outreach_sequences").select("id", { count: "exact", head: true }).eq("user_uid", uid).neq("status", "arsiv"),
    browseUsedToday(uid).catch(() => 0),
  ]);
  return {
    plan: account.plan,
    credits: account.credits,
    senders: { used: boxes.count ?? 0, limit: account.plan.senders },
    campaigns: { used: seqs.count ?? 0, limit: account.plan.campaigns },
    browse: { used: browsed, limit: account.plan.browsePerDay },
    monthlyCapacity: monthlyCapacity(account.plan),
  };
}
