import type { PlanItem } from "./types";

/**
 * Takvim hesapları (saf fonksiyonlar). Tüm gün/saat işlemleri kullanıcının yerel saatindedir:
 * hafta Pazartesi'den başlar (Türkiye).
 */

export const weekdayShort = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;

/** Yerel gün anahtarı: "2026-10-08". */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());

/** "2026-10-08" → yerel gün başlangıcı. */
export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Ayın görüneceği 6 haftalık (42 günlük) ızgara; Pazartesi'den başlar. */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Pazartesi = 0
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - offset + i));
}

/** Izgaranın kapsadığı aralık: [başlangıç, bitiş) — API sorgusu için. */
export function gridRange(year: number, month: number): { from: Date; to: Date } {
  const grid = monthGrid(year, month);
  return { from: grid[0], to: addDays(grid[41], 1) };
}

const timeFmt = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false });
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));

export const formatMonth = (d: Date) => new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(d);
export const formatDayLong = (d: Date) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", weekday: "long" }).format(d);
export const formatDayShort = (d: Date) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(d);

/** Öğenin süresini kısa yazar: "14:30" ya da "14:30–15:30" ya da "Tüm gün". */
export function formatSlot(item: Pick<PlanItem, "startsAt" | "endsAt" | "allDay">): string {
  if (item.allDay) return "Tüm gün";
  const start = formatTime(item.startsAt);
  if (!item.endsAt) return start;
  const sameDay = dayKey(new Date(item.startsAt)) === dayKey(new Date(item.endsAt));
  return sameDay ? `${start}–${formatTime(item.endsAt)}` : start;
}

/** Öğeleri, kapladıkları her güne yerleştirir; gün içinde tüm gün önce, sonra saate göre sıralı. */
export function itemsByDay(items: readonly PlanItem[]): Map<string, PlanItem[]> {
  const map = new Map<string, PlanItem[]>();
  for (const item of items) {
    const start = startOfDay(new Date(item.startsAt));
    const end = item.endsAt ? startOfDay(new Date(item.endsAt)) : start;
    for (let d = start, n = 0; d <= end && n < 15; d = addDays(d, 1), n++) {
      const key = dayKey(d);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => Number(b.allDay) - Number(a.allDay) || Date.parse(a.startsAt) - Date.parse(b.startsAt));
  }
  return map;
}

/** Aynı anda başka bir plan var mı? (tüm gün, not ve tamamlanan öğeler çakışma sayılmaz) */
export function overlaps(a: { startsAt: string; endsAt: string | null }, others: readonly PlanItem[], selfId?: string): PlanItem[] {
  const aStart = Date.parse(a.startsAt);
  const aEnd = a.endsAt ? Date.parse(a.endsAt) : aStart + 30 * 60_000;
  return others.filter((o) => {
    if (o.id === selfId || o.allDay || o.kind === "not" || o.done) return false;
    const oStart = Date.parse(o.startsAt);
    const oEnd = o.endsAt ? Date.parse(o.endsAt) : oStart + 30 * 60_000;
    return aStart < oEnd && oStart < aEnd;
  });
}

/** Form alanları ↔ ISO. Tarih "2026-10-08", saat "14:30" (yerel). */
export const toDateInput = (iso: string) => dayKey(new Date(iso));
export const toTimeInput = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
export function fromLocalInputs(date: string, time: string | null): string {
  return new Date(`${date}T${time || "00:00"}:00`).toISOString();
}

// ---- Dışa aktarma -------------------------------------------------------------------------------------------

type Exportable = Pick<PlanItem, "title" | "details" | "startsAt" | "endsAt" | "allDay" | "location" | "withName">;

const utcStamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const dateStamp = (d: Date) => dayKey(d).replace(/-/g, "");

function range(item: Exportable): { start: string; end: string } {
  if (item.allDay) {
    const first = startOfDay(new Date(item.startsAt));
    const last = item.endsAt ? startOfDay(new Date(item.endsAt)) : first;
    return { start: dateStamp(first), end: dateStamp(addDays(last, 1)) }; // bitiş dahil değil
  }
  const end = item.endsAt ?? new Date(Date.parse(item.startsAt) + 30 * 60_000).toISOString();
  return { start: utcStamp(item.startsAt), end: utcStamp(end) };
}

const description = (item: Exportable) => [item.withName && `Kişi: ${item.withName}`, item.details].filter(Boolean).join("\n");

/** Google Takvim'de "etkinlik oluştur" sayfasını bu bilgilerle dolu açan bağlantı. */
export function googleCalendarUrl(item: Exportable): string {
  const { start, end } = range(item);
  const q = new URLSearchParams({ action: "TEMPLATE", text: item.title, dates: `${start}/${end}` });
  const d = description(item);
  if (d) q.set("details", d);
  if (item.location) q.set("location", item.location);
  return `https://calendar.google.com/calendar/render?${q.toString().replace(/\+/g, "%20")}`;
}

const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Herhangi bir takvim uygulamasının (Apple, Outlook…) içe aktarabileceği .ics dosyası içeriği. */
export function toIcs(item: Exportable & { id: string }, now: Date = new Date()): string {
  const { start, end } = range(item);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Adspine//Plan//TR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${item.id}@adspine.app`,
    `DTSTAMP:${utcStamp(now.toISOString())}`,
    item.allDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`,
    item.allDay ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`,
    `SUMMARY:${icsText(item.title)}`,
    description(item) && `DESCRIPTION:${icsText(description(item))}`,
    item.location && `LOCATION:${icsText(item.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n") + "\r\n";
}
