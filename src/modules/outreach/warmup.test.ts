import { describe, expect, it } from "vitest";
import { effectiveDailyLimit, summarize, warmupQuota, warmupScore, type WarmupStatus } from "./warmup-rules";
import { newWarmupToken, warmupMessage, warmupReply } from "./warmup-bank";

describe("ısındırma kotası", () => {
  it("yavaş başlar ve haftalar içinde artar", () => {
    expect([0, 2, 3, 5, 6, 9, 10, 14, 15, 21, 22, 60].map(warmupQuota)).toEqual([2, 2, 4, 4, 8, 8, 12, 12, 16, 16, 20, 20]);
  });
});

describe("ısınırken otomasyon limiti", () => {
  const start = "2026-10-01T00:00:00Z";
  const day = (n: number) => Date.parse(start) + n * 86_400_000 + 3_600_000;
  it("ısınma kapalıysa kullanıcının limiti geçerlidir", () => {
    expect(effectiveDailyLimit({ dailyLimit: 40, warmupEnabled: false, warmupStartedAt: start }, day(1))).toBe(40);
  });
  it("ısınma açıkken kademeli artar ve hedefi aşmaz", () => {
    const m = { dailyLimit: 30, warmupEnabled: true, warmupStartedAt: start };
    expect(effectiveDailyLimit(m, day(0))).toBe(5);
    expect(effectiveDailyLimit(m, day(5))).toBe(10);
    expect(effectiveDailyLimit(m, day(10))).toBe(20);
    expect(effectiveDailyLimit(m, day(40))).toBe(30);
    expect(effectiveDailyLimit({ ...m, dailyLimit: 8 }, day(10))).toBe(8);
  });
});

describe("ısınma skoru", () => {
  const rows = (n: Record<WarmupStatus, number>) => (Object.entries(n) as [WarmupStatus, number][]).flatMap(([s, c]) => Array<WarmupStatus>(c).fill(s));
  it("yeterli veri yoksa null", () => {
    expect(warmupScore(rows({ gonderildi: 3, gelen_kutusu: 4, spam: 0, yanitlandi: 0, kayip: 0 }))).toBeNull();
  });
  it("gelen kutusu oranını verir; spam ve kayıp kötüdür, yoldakiler sayılmaz", () => {
    expect(warmupScore(rows({ gonderildi: 5, gelen_kutusu: 6, spam: 2, yanitlandi: 2, kayip: 0 }))).toBe(80);
    expect(warmupScore(rows({ gonderildi: 0, gelen_kutusu: 5, spam: 0, yanitlandi: 0, kayip: 5 }))).toBe(50);
  });
  it("özet sayıları çıkarır", () => {
    const now = Date.parse("2026-10-10T12:00:00Z");
    const s = summarize(
      [
        { status: "gelen_kutusu", sent_at: "2026-10-10T08:00:00Z" },
        { status: "yanitlandi", sent_at: "2026-10-09T08:00:00Z" },
        { status: "spam", sent_at: "2026-10-05T08:00:00Z" },
      ],
      "2026-10-01T00:00:00Z",
      now,
    );
    expect(s).toMatchObject({ days: 9, quota: 8, sentToday: 1, sent14d: 3, inbox: 2, spam: 1, replied: 1, score: null });
  });
});

describe("ısındırma metinleri", () => {
  it("kısa, düz metin ve selamlamalı e-posta üretir", () => {
    const m = warmupMessage("Ayşe Demir", "Elif Yıldız", () => 0);
    expect(m.subject.length).toBeGreaterThan(5);
    expect(m.text).toContain("Ayşe");
    expect(m.text).toContain("Elif");
    expect(m.text).not.toMatch(/https?:|www\.|!|%/);
  });
  it("farklı rastgelelikle farklı iletiler çıkar", () => {
    const seen = new Set(Array.from({ length: 30 }, (_, i) => warmupMessage(null, null, () => ((i * 37) % 100) / 100).subject + "|" + warmupMessage(null, null, () => ((i * 53) % 100) / 100).text));
    expect(seen.size).toBeGreaterThan(5);
  });
  it("yanıt ve jeton üretir", () => {
    expect(warmupReply("Ayşe", "Elif", () => 0.3)).toContain("Ayşe");
    expect(newWarmupToken()).toMatch(/^[a-f0-9]{32}$/);
    expect(newWarmupToken()).not.toBe(newWarmupToken());
  });
});
