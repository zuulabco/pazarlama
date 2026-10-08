import { describe, expect, it } from "vitest";
import { blockedMessage, browseAllowance, monthStartIso } from "./browse-pool";

describe("listeleme havuzu", () => {
  it("iki sınırın küçüğünü verir", () => {
    expect(browseAllowance({ usedToday: 10, usedMonth: 20, perDay: 50, perMonth: 75 })).toEqual({ left: 40, monthLeft: 55, dayLeft: 40, blockedBy: null });
    expect(browseAllowance({ usedToday: 0, usedMonth: 70, perDay: 50, perMonth: 75 })).toMatchObject({ left: 5, blockedBy: null });
  });
  it("hangi sınırın engellediğini söyler", () => {
    expect(browseAllowance({ usedToday: 0, usedMonth: 75, perDay: 50, perMonth: 75 })).toMatchObject({ left: 0, blockedBy: "ay" });
    expect(browseAllowance({ usedToday: 50, usedMonth: 60, perDay: 50, perMonth: 75 })).toMatchObject({ left: 0, blockedBy: "gun" });
  });
  it("kullanım sınırı aşsa bile eksiye düşmez", () => {
    expect(browseAllowance({ usedToday: 80, usedMonth: 200, perDay: 50, perMonth: 75 }).left).toBe(0);
  });
  it("ay başı İstanbul takvimine göredir", () => {
    expect(monthStartIso(new Date("2026-10-15T12:00:00Z"))).toBe("2026-09-30T21:00:00.000Z");
    // 30 Eylül 22:00 UTC = 1 Ekim 01:00 İstanbul: yeni ay
    expect(monthStartIso(new Date("2026-09-30T22:00:00Z"))).toBe("2026-09-30T21:00:00.000Z");
    expect(monthStartIso(new Date("2026-09-30T20:00:00Z"))).toBe("2026-08-31T21:00:00.000Z");
  });
  it("mesajlar nedene göre değişir", () => {
    const m = browseAllowance({ usedToday: 0, usedMonth: 75, perDay: 50, perMonth: 75 });
    expect(blockedMessage(m, "Ücretsiz", 75, 50, 25)).toContain("Bu ayki");
    const d = browseAllowance({ usedToday: 50, usedMonth: 0, perDay: 50, perMonth: 75 });
    expect(blockedMessage(d, "Ücretsiz", 75, 50, 25)).toContain("Bugünkü");
    const p = browseAllowance({ usedToday: 30, usedMonth: 0, perDay: 50, perMonth: 75 });
    expect(blockedMessage(p, "Ücretsiz", 75, 50, 25)).toContain("en çok 20");
  });
});
