/**
 * Bounce Guard (saf): kampanyanın geri dönen e-posta oranına göre sağlık bandı ve otomatik duraklatma kararı.
 * Eşikler Apollo'nun bandlarıyla aynıdır: %0–3,9 iyi · %4–5,4 gelişmeli · %5,5+ kritik.
 */

export type Band = "iyi" | "gelisebilir" | "kritik";

export const guardDefaults = { warn: 4, pause: 5.5, minVolume: 25, windowDays: 7 } as const;

export const bandLabels: Record<Band, string> = { iyi: "İyi", gelisebilir: "Gelişmeli", kritik: "Kritik" };

export function bounceRate(sent: number, bounced: number): number {
  return sent > 0 ? (bounced / sent) * 100 : 0;
}

export function bounceBand(rate: number): Band {
  return rate >= guardDefaults.pause ? "kritik" : rate >= guardDefaults.warn ? "gelisebilir" : "iyi";
}

/** Yeterli hacim varsa ve oran duraklatma eşiğindeyse kampanya durdurulur. Az örnekte karar verilmez (tek bounce yanıltmasın). */
export function shouldPause(sent: number, bounced: number, opts: { pause?: number; minVolume?: number } = {}): boolean {
  const { pause = guardDefaults.pause, minVolume = guardDefaults.minVolume } = opts;
  return sent >= minVolume && bounceRate(sent, bounced) >= pause;
}

export const pauseMessage = (rate: number) =>
  `Geri dönen e-posta oranı %${rate.toFixed(1).replace(".", ",")} (eşik %${String(guardDefaults.pause).replace(".", ",")}): kampanya itibarınızı korumak için otomatik duraklatıldı. Kişi listenizi temizleyip yeniden başlatın.`;
