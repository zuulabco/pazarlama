import { warmupDailyCap } from "./limits";

/**
 * Isındırma kuralları (saf): günlük ısınma e-postası kotası, ısınma skoru ve ısınırken kampanya limiti.
 */

export type WarmupStatus = "gonderildi" | "gelen_kutusu" | "spam" | "yanitlandi" | "kayip";

const DAY = 86_400_000;

/** Isınmanın başlangıcından bu yana geçen tam gün (0'dan). */
export const daysSince = (startedAt: string | null, now = Date.now()) => (startedAt ? Math.max(Math.floor((now - Date.parse(startedAt)) / DAY), 0) : 0);

/**
 * Bir adresin günde göndereceği ısınma e-postası: yavaş başlar, haftalar içinde artar.
 * Gün 0-2: 2 · 3-5: 4 · 6-9: 8 · 10-14: 12 · 15-21: 16 · sonra 20.
 */
export function warmupQuota(days: number): number {
  const steps: [number, number][] = [
    [2, 2],
    [5, 4],
    [9, 8],
    [14, 12],
    [21, 16],
  ];
  for (const [until, n] of steps) if (days <= until) return n;
  return 20;
}

/** Isınma açıkken kampanya e-postaları için günlük üst sınır (kademeli); kapalıyken kullanıcının kendi limiti. */
export function effectiveDailyLimit(m: { dailyLimit: number; warmupEnabled: boolean; warmupStartedAt: string | null }, now = Date.now()): number {
  return m.warmupEnabled && m.warmupStartedAt ? warmupDailyCap(daysSince(m.warmupStartedAt, now) + 1, m.dailyLimit) : m.dailyLimit;
}

/** Skor için en az bu kadar sonuçlanmış ileti gerekir; azıyla yanıltıcı yüzde çıkar. */
export const MIN_SCORED = 5;

/** İletinin sonucu belli olması için beklenen süre: bundan eskiye hâlâ "yolda" ise kayıp sayılır. */
export const LOST_AFTER_MS = 2 * 3_600_000;

/**
 * Isınma skoru (0-100): sonuçlanan iletilerin kaçı gelen kutusuna ulaştı (spam ve kayıp kötü sayılır).
 * Yeterli veri yoksa null.
 */
export function warmupScore(statuses: WarmupStatus[]): number | null {
  const resolved = statuses.filter((s) => s !== "gonderildi");
  if (resolved.length < MIN_SCORED) return null;
  const good = resolved.filter((s) => s === "gelen_kutusu" || s === "yanitlandi").length;
  return Math.round((100 * good) / resolved.length);
}

export type WarmupStats = { days: number; quota: number; sentToday: number; sent14d: number; inbox: number; spam: number; replied: number; lost: number; pending: number; score: number | null };

export function summarize(rows: { status: WarmupStatus; sent_at: string }[], startedAt: string | null, now = Date.now()): WarmupStats {
  const days = daysSince(startedAt, now);
  const count = (s: WarmupStatus) => rows.filter((r) => r.status === s).length;
  return {
    days,
    quota: warmupQuota(days),
    sentToday: rows.filter((r) => now - Date.parse(r.sent_at) < DAY).length,
    sent14d: rows.length,
    inbox: count("gelen_kutusu") + count("yanitlandi"),
    spam: count("spam"),
    replied: count("yanitlandi"),
    lost: count("kayip"),
    pending: count("gonderildi"),
    score: warmupScore(rows.map((r) => r.status)),
  };
}
