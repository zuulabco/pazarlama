import { warmupDailyCap } from "./limits";
import { isWithinWindow, zoned, type Schedule } from "./schedule";

/**
 * Isındırma kuralları (saf): günlük ısınma e-postası kotası, ısınma skoru ve ısınırken otomasyon limiti.
 */

export type WarmupStatus = "gonderildi" | "gelen_kutusu" | "spam" | "yanitlandi" | "kayip";

const DAY = 86_400_000;

/** Isındırma yalnızca bu saatlerde (İstanbul) gönderilir: gece e-postası doğal görünmez. */
export const WARMUP_WINDOW: Schedule = { tz: "Europe/Istanbul", days: [1, 2, 3, 4, 5, 6, 7], start: "08:30", end: "20:30" };
/** Zamanlayıcı en sık bu kadar dakikada bir çalışır. */
export const TICK_MINUTES = 5;

/** İstanbul takvimine göre bugünün ilk anı (ms). İstanbul UTC+3'tür, yaz saati yoktur. */
export const dayStartMs = (now = Date.now()) => Math.floor((now + 3 * 3_600_000) / DAY) * DAY - 3 * 3_600_000;

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Bu tick'te bir ısındırma e-postası gönderilmeli mi? Günlük kota, gönderim penceresine eşit aralıklarla yayılır:
 * ilk e-posta pencerenin ilk tick'inde, sonuncusu pencerenin sonuna doğru gider. Rastgelelik yoktur; böylece "bugün hiç gitmedi" olmaz.
 */
export function warmupDue(a: { quota: number; sentToday: number; now: Date }): boolean {
  if (!isWithinWindow(a.now, WARMUP_WINDOW) || a.sentToday >= a.quota) return false;
  const start = toMin(WARMUP_WINDOW.start);
  const len = toMin(WARMUP_WINDOW.end) - start;
  const elapsed = zoned(a.now, WARMUP_WINDOW.tz).minutes - start;
  const expected = Math.min(Math.ceil((a.quota * (elapsed + TICK_MINUTES)) / len), a.quota);
  return a.sentToday < expected;
}

/** Kademe tablosu (arayüzde gösterilir): her satır bir gün aralığı (1'den başlar; `to` null ise sonrasında hep) ve günlük e-posta sayısı. */
export function warmupRamp(): { from: number; to: number | null; quota: number }[] {
  const out: { from: number; to: number | null; quota: number }[] = [];
  for (let d = 0; d <= 22; d++) {
    const q = warmupQuota(d);
    const last = out[out.length - 1];
    if (last && last.quota === q) last.to = d + 1;
    else out.push({ from: d + 1, to: d + 1, quota: q });
  }
  out[out.length - 1].to = null;
  return out;
}

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

/** Isınma açıkken otomasyon e-postaları için günlük üst sınır (kademeli); kapalıyken kullanıcının kendi limiti. */
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
    sentToday: rows.filter((r) => Date.parse(r.sent_at) >= dayStartMs(now)).length,
    sent14d: rows.length,
    inbox: count("gelen_kutusu") + count("yanitlandi"),
    spam: count("spam"),
    replied: count("yanitlandi"),
    lost: count("kayip"),
    pending: count("gonderildi"),
    score: warmupScore(rows.map((r) => r.status)),
  };
}
