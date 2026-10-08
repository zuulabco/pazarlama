/** Gönderim limitleri (saf): posta kutusu ve kampanya için bir tick'te en çok kaç e-posta gönderilebileceği. */

export type Counts = { lastHour: number; last24h: number };

/**
 * Posta kutusunun şu an gönderebileceği e-posta sayısı: saatlik ve (kayan 24 saatlik) günlük limitten kalanların küçüğü.
 * Kayan pencere, gece yarısı sıfırlanan takvim gününden daha güvenlidir: gün başında ani patlama olmaz.
 */
export function mailboxCapacity(limits: { dailyLimit: number; hourlyLimit: number }, sent: Counts): number {
  return Math.max(0, Math.min(limits.hourlyLimit - sent.lastHour, limits.dailyLimit - sent.last24h));
}

/** Kampanyanın kendi 24 saatlik üst sınırı (boşsa sınırsız) dikkate alınarak kalan kapasite. */
export function campaignCapacity(max24h: number | null, sentLast24h: number): number {
  return max24h === null ? Number.POSITIVE_INFINITY : Math.max(0, max24h - sentLast24h);
}

/**
 * Isınma (warm-up) sırasında günlük üst sınır: yeni kutu düşük başlar, haftalar içinde hedefe çıkar.
 * Başlangıçtan geçen gün sayısına göre: 1-3. gün 5 · 4-7: 10 · 8-14: 20 · 15-21: 30 · 22-28: 40 · sonra hedef.
 */
export function warmupDailyCap(daysSinceStart: number, target: number): number {
  const steps: [number, number][] = [
    [3, 5],
    [7, 10],
    [14, 20],
    [21, 30],
    [28, 40],
  ];
  for (const [until, cap] of steps) if (daysSinceStart <= until) return Math.min(cap, target);
  return target;
}
