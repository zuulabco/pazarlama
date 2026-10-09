import "server-only";
import { db } from "@/lib/supabase/server";
import { OutreachUnavailableError } from "./contacts";
import { adminAuth } from "@/lib/firebase/admin";
import { founderEmails, founderPlan, planOf, plans, type Plan } from "./plans";

export type Account = { plan: Plan; credits: number; periodStart: string };

export class InsufficientCreditsError extends Error {
  constructor(readonly needed: number, readonly available: number) {
    super(`Yeterli Adspine Krediniz yok: ${needed} Adspine Kredi gerekiyor, ${available} Adspine Kredi kaldı.`);
  }
}

const unavailable = (e: { code?: string; message: string } | null) => {
  if (!e) return;
  if (e.code === "42P01" || e.code === "PGRST205" || e.code === "PGRST202" || e.code === "42883") throw new OutreachUnavailableError();
  throw new Error(e.message);
};

const founderCache = new Map<string, boolean>();

/** Oturum e-postası kurucu listesinde mi? (Firebase'den bir kez sorulur, süreç boyunca saklanır.) Ulaşılamazsa kurucu sayılmaz. */
async function isFounder(uid: string): Promise<boolean> {
  const hit = founderCache.get(uid);
  if (hit !== undefined) return hit;
  try {
    const email = (await adminAuth().getUser(uid)).email?.toLowerCase() ?? "";
    const yes = founderEmails.includes(email);
    founderCache.set(uid, yes);
    return yes;
  } catch {
    return false;
  }
}

/**
 * Kullanıcının paketini ve kalan kredisini döndürür; hesap yoksa ücretsiz paketle açar, ay değiştiyse krediyi yeniler.
 * Paketin kredisi veritabanına parametre olarak verilir; mevcut hesabın paketi önce okunur.
 */
export async function getAccount(uid: string): Promise<Account> {
  const existing = await db().from("outreach_accounts").select("plan").eq("user_uid", uid).maybeSingle<{ plan: string }>();
  unavailable(existing.error);
  const founder = await isFounder(uid);
  const plan = founder ? founderPlan : planOf(existing.data?.plan);
  const { data, error } = await db().rpc("outreach_account_touch", { p_uid: uid, p_monthly: plan.monthlyCredits });
  unavailable(error);
  const row = (Array.isArray(data) ? data[0] : data) as { out_plan: string; out_credits: number; out_period_start: string } | null;
  let credits = row?.out_credits ?? plan.monthlyCredits;
  // Kurucu hesabı: bakiye yarıya düşerse tam değere tamamlanır (sınırsız hissi; ledger'a "elle" olarak yazılır).
  if (founder && credits < plan.monthlyCredits / 2) {
    const topped = await db().rpc("outreach_credit_change", { p_uid: uid, p_delta: plan.monthlyCredits - credits, p_reason: "elle", p_ref: "kurucu" });
    if (typeof topped.data === "number") credits = topped.data;
  }
  return { plan: founder ? plan : planOf(row?.out_plan ?? plan.key), credits, periodStart: row?.out_period_start ?? new Date().toISOString() };
}

/** Krediyi atomik olarak düşer; yetmiyorsa hata fırlatır. Yeni bakiyeyi döndürür. */
export async function spendCredits(uid: string, amount: number, reason: "arama", ref: string): Promise<number> {
  if (amount <= 0) return (await getAccount(uid)).credits;
  const { data, error } = await db().rpc("outreach_credit_change", { p_uid: uid, p_delta: -amount, p_reason: reason, p_ref: ref });
  unavailable(error);
  if (data === null || data === undefined) throw new InsufficientCreditsError(amount, (await getAccount(uid)).credits);
  return data as number;
}

/** Kullanılmayan krediyi iade eder. */
export async function refundCredits(uid: string, amount: number, ref: string): Promise<void> {
  if (amount <= 0) return;
  const { error } = await db().rpc("outreach_credit_change", { p_uid: uid, p_delta: amount, p_reason: "iade", p_ref: ref });
  unavailable(error);
}

/** Kullanıcının paketini değiştirir (ödeme bağlanana kadar elle/yönetici işlemi için). */
export async function setPlan(uid: string, plan: keyof typeof plans) {
  await getAccount(uid);
  const { error } = await db().from("outreach_accounts").update({ plan }).eq("user_uid", uid);
  unavailable(error);
}
