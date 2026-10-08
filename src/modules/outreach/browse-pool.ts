/**
 * Listeleme havuzu (saf): kişi listelemek sağlayıcıya ödeme yaptırdığı için iki sınır birlikte uygulanır.
 *  - Aylık havuz: her ay başında yenilenir (kredinin 3 katı); kullanıcı yoğun bir günde de kullanabilir.
 *  - Günlük tavan: havuzun tek günde bitmesini ve otomatik kazımayı önler.
 */

export type BrowseAllowance = {
  /** Şu an listelenebilecek en çok kişi (iki sınırın küçüğü). */
  left: number;
  /** Aylık havuzda kalan. */
  monthLeft: number;
  /** Bugünkü tavandan kalan. */
  dayLeft: number;
  /** Sınırı hangisi belirliyor (left > 0 ise null). */
  blockedBy: "ay" | "gun" | null;
};

export function browseAllowance(a: { usedToday: number; usedMonth: number; perDay: number; perMonth: number }): BrowseAllowance {
  const monthLeft = Math.max(a.perMonth - a.usedMonth, 0);
  const dayLeft = Math.max(a.perDay - a.usedToday, 0);
  const left = Math.min(monthLeft, dayLeft);
  return { left, monthLeft, dayLeft, blockedBy: left > 0 ? null : monthLeft === 0 ? "ay" : "gun" };
}

/** İstanbul takvimine göre bu ayın ilk anı (UTC ISO). Krediler de aynı ay sınırında yenilenir. */
export function monthStartIso(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit" }).format(now).split("-");
  // İstanbul UTC+3 (yaz saati uygulanmıyor): ayın ilk günü 00:00 = önceki gün 21:00 UTC.
  return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, 1, -3, 0, 0)).toISOString();
}

/** Kullanıcıya gösterilecek, sınır aşılınca çıkan mesaj. */
export function blockedMessage(a: BrowseAllowance, label: string, perMonth: number, perDay: number, wanted: number): string {
  if (a.blockedBy === "ay") return `Bu ayki listeleme hakkınız (${perMonth} kişi) doldu; ay başında yenilenir.`;
  if (a.blockedBy === "gun") return `Bugünkü listeleme sınırına (${perDay} kişi) ulaştınız; yarın devam edebilirsiniz.`;
  return `${label} paketinde şu an en çok ${a.left} kişi listeleyebilirsiniz (istediğiniz: ${wanted}). Kişi sayısını azaltın.`;
}
