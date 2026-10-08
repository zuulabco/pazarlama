/** Gönderim penceresi hesapları (saf). Saat dilimi `Intl` ile çözülür; Türkiye varsayılandır (Europe/Istanbul, UTC+3). */

export type Schedule = {
  /** IANA saat dilimi, örn. "Europe/Istanbul". */
  tz: string;
  /** 1 = Pazartesi … 7 = Pazar. */
  days: number[];
  /** "HH:MM" */
  start: string;
  end: string;
};

export const defaultSchedule: Schedule = { tz: "Europe/Istanbul", days: [1, 2, 3, 4, 5], start: "09:00", end: "18:00" };

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

type Zoned = { y: number; mo: number; d: number; weekday: number; minutes: number };

/** Bir anın verilen saat dilimindeki yıl/ay/gün/haftanın günü/gün içi dakikası. */
export function zoned(date: Date, tz: string): Zoned {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", weekday: "short" })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const wk = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday) + 1;
  return { y: Number(parts.year), mo: Number(parts.month), d: Number(parts.day), weekday: wk, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

/** Saat diliminde verilen yerel tarih ve saati UTC anına çevirir. */
export function zonedToUtc(y: number, mo: number, d: number, minutes: number, tz: string): Date {
  const guess = Date.UTC(y, mo - 1, d, Math.floor(minutes / 60), minutes % 60);
  // Saat diliminin o andaki farkı: tahmini anın yerel karşılığı ile UTC farkı. Yaz saati geçişi için iki kez düzeltilir.
  const offsetAt = (t: number) => {
    const z = zoned(new Date(t), tz);
    return Date.UTC(z.y, z.mo - 1, z.d, Math.floor(z.minutes / 60), z.minutes % 60) - t;
  };
  let t = guess - offsetAt(guess);
  t = guess - offsetAt(t);
  return new Date(t);
}

export function isWithinWindow(date: Date, s: Schedule): boolean {
  const z = zoned(date, s.tz);
  return s.days.includes(z.weekday) && z.minutes >= toMinutes(s.start) && z.minutes < toMinutes(s.end);
}

/** `date` pencere içindeyse kendisi; değilse bir sonraki pencerenin başlangıcı. Hiç gün seçili değilse null. */
export function nextWindowStart(date: Date, s: Schedule): Date | null {
  if (s.days.length === 0) return null;
  if (isWithinWindow(date, s)) return date;
  const z = zoned(date, s.tz);
  for (let offset = 0; offset <= 8; offset++) {
    const day = new Date(Date.UTC(z.y, z.mo - 1, z.d + offset, 12)); // gün hesabı için öğlen: saat kaymasından etkilenmez
    const wk = ((z.weekday - 1 + offset) % 7) + 1;
    if (!s.days.includes(wk)) continue;
    const candidate = zonedToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), toMinutes(s.start), s.tz);
    if (candidate.getTime() > date.getTime()) return candidate;
  }
  return null;
}

/** Aynı anda başlayan gönderimlerin sıralı görünmemesi için 0..maxMinutes dakikalık rastgele gecikme. */
export function jitter(date: Date, maxMinutes: number, random: () => number = Math.random): Date {
  return new Date(date.getTime() + Math.floor(random() * maxMinutes * 60_000));
}

/** Adım gecikmesi (dakika) ve pencereyle bir sonraki gönderim anı: gecikme eklenir, pencere dışındaysa pencerenin başına çekilir. */
export function nextRunAt(from: Date, delayMinutes: number, s: Schedule): Date | null {
  return nextWindowStart(new Date(from.getTime() + delayMinutes * 60_000), s);
}

export const delayUnits = [
  { value: "minutes", label: "dakika", factor: 1 },
  { value: "hours", label: "saat", factor: 60 },
  { value: "days", label: "gün", factor: 1440 },
] as const;

/** Dakikayı en uygun birimle gösterir: 1440 → { value: 1, unit: "days" }. */
export function splitDelay(minutes: number): { value: number; unit: "minutes" | "hours" | "days" } {
  if (minutes > 0 && minutes % 1440 === 0) return { value: minutes / 1440, unit: "days" };
  if (minutes > 0 && minutes % 60 === 0) return { value: minutes / 60, unit: "hours" };
  return { value: minutes, unit: "minutes" };
}

export function describeDelay(minutes: number): string {
  if (minutes <= 0) return "Hemen";
  const { value, unit } = splitDelay(minutes);
  return `${value} ${delayUnits.find((u) => u.value === unit)!.label} sonra`;
}
