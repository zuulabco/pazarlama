import { describe, expect, it } from "vitest";
import { dayKey, fromLocalInputs, googleCalendarUrl, itemsByDay, monthGrid, overlaps, toDateInput, toIcs, toTimeInput } from "./calendar";
import { planInputSchema, planPatchSchema, type PlanItem } from "./types";

const item = (over: Partial<PlanItem> = {}): PlanItem => ({
  id: "a1",
  kind: "toplanti",
  title: "Moda Kafe ile görüşme",
  details: "",
  startsAt: new Date(2026, 9, 9, 14, 30).toISOString(),
  endsAt: new Date(2026, 9, 9, 15, 30).toISOString(),
  allDay: false,
  favoriteId: null,
  withName: null,
  location: null,
  done: false,
  ...over,
});

describe("monthGrid", () => {
  it("42 gün, Pazartesi'den başlar ve ayı kapsar", () => {
    const grid = monthGrid(2026, 9); // Ekim 2026: 1 Ekim Perşembe
    expect(grid).toHaveLength(42);
    expect(grid[0].getDay()).toBe(1);
    expect(dayKey(grid[0])).toBe("2026-09-28");
    expect(grid.map(dayKey)).toContain("2026-10-31");
  });
  it("ayın ilk günü Pazartesi ise ızgara o günle başlar", () => {
    expect(dayKey(monthGrid(2026, 5)[0])).toBe("2026-06-01"); // 1 Haziran 2026 Pazartesi
  });
});

describe("itemsByDay", () => {
  it("çok günlü öğeyi kapladığı her güne koyar, tüm gün öğesini öne alır", () => {
    const multi = item({ id: "m", allDay: true, startsAt: new Date(2026, 9, 9).toISOString(), endsAt: new Date(2026, 9, 11).toISOString() });
    const timed = item({ id: "t" });
    const map = itemsByDay([timed, multi]);
    expect([...map.keys()].sort()).toEqual(["2026-10-09", "2026-10-10", "2026-10-11"]);
    expect(map.get("2026-10-09")!.map((i) => i.id)).toEqual(["m", "t"]);
  });
});

describe("overlaps", () => {
  it("aynı saatteki planı bulur; tamamlananı, tüm günü ve kendisini saymaz", () => {
    const other = item({ id: "x", startsAt: new Date(2026, 9, 9, 15, 0).toISOString(), endsAt: new Date(2026, 9, 9, 16, 0).toISOString() });
    const probe = { startsAt: item().startsAt, endsAt: item().endsAt };
    expect(overlaps(probe, [other])).toHaveLength(1);
    expect(overlaps(probe, [{ ...other, done: true }, { ...other, allDay: true }])).toHaveLength(0);
    expect(overlaps(probe, [other], "x")).toHaveLength(0);
  });
});

describe("form ↔ ISO", () => {
  it("tarih ve saati yerel olarak gidiş-dönüş çevirir", () => {
    const iso = fromLocalInputs("2026-10-09", "14:30");
    expect(toDateInput(iso)).toBe("2026-10-09");
    expect(toTimeInput(iso)).toBe("14:30");
    expect(toTimeInput(fromLocalInputs("2026-10-09", null))).toBe("00:00");
  });
});

describe("dışa aktarma", () => {
  it("Google Takvim bağlantısı başlığı, tarihleri ve notu taşır", () => {
    const url = new URL(googleCalendarUrl(item({ details: "Teklifi götür", location: "Moda", withName: "Moda Kafe" })));
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Moda Kafe ile görüşme");
    expect(url.searchParams.get("dates")).toMatch(/^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/);
    expect(url.searchParams.get("details")).toBe("Kişi: Moda Kafe\nTeklifi götür");
    expect(url.searchParams.get("location")).toBe("Moda");
  });
  it("tüm gün etkinliğinde bitiş ertesi gündür (dahil değil)", () => {
    const url = new URL(googleCalendarUrl(item({ allDay: true, startsAt: new Date(2026, 9, 9).toISOString(), endsAt: null })));
    expect(url.searchParams.get("dates")).toBe("20261009/20261010");
  });
  it(".ics metni kaçışlıdır ve CRLF ile biter", () => {
    const ics = toIcs(item({ title: "A, B; C", details: "satır1\nsatır2" }), new Date("2026-10-01T00:00:00Z"));
    expect(ics).toContain("SUMMARY:A\\, B\\; C");
    expect(ics).toContain("DESCRIPTION:satır1\\nsatır2");
    expect(ics).toContain("UID:a1@adspine.app");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});

describe("planInputSchema", () => {
  const ok = { kind: "randevu", title: "  Görüşme ", startsAt: "2026-10-09T11:30:00.000Z" };
  it("boşlukları kırpar ve varsayılanları doldurur", () => {
    const r = planInputSchema.parse(ok);
    expect(r).toMatchObject({ title: "Görüşme", details: "", allDay: false, done: false, endsAt: null, favoriteId: null, withName: null, location: null });
  });
  it("boş başlığı, ters aralığı ve 14 günden uzun süreyi reddeder", () => {
    expect(planInputSchema.safeParse({ ...ok, title: " " }).success).toBe(false);
    expect(planInputSchema.safeParse({ ...ok, endsAt: "2026-10-09T10:00:00.000Z" }).success).toBe(false);
    expect(planInputSchema.safeParse({ ...ok, endsAt: "2026-11-09T10:00:00.000Z" }).success).toBe(false);
    expect(planInputSchema.safeParse({ ...ok, endsAt: "2026-10-09T12:30:00.000Z" }).success).toBe(true);
  });
  it("kısmi güncellemede yalnızca verilen alanlar gelir", () => {
    expect(planPatchSchema.parse({ done: true })).toEqual({ done: true });
  });
});
