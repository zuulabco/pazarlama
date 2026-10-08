import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/llm/nvidia", () => ({ chatJson: vi.fn() }));

const { leadFilterMessages, toFilters } = await import("./lead-ai");
const { leadSearchSchema } = await import("./lead-options");

const raw = (over: Record<string, unknown> = {}) => ({ kisi_turleri: [], unvanlar: [], ulke: null, sehir: null, sektorler: [], calisan_araliklari: [], anahtar_kelimeler: [], ...over });

describe("yapay zekâ süzgeçleri", () => {
  it("istemde tüm seçenek kodları ve kurallar bulunur", () => {
    const [system, user] = leadFilterMessages("İstanbul'daki ajansların kurucuları");
    expect(system.content).toContain("- pazarlama (Pazarlama yöneticileri)");
    expect(system.content).toContain("- Marketing & Advertising (Pazarlama ve reklam)");
    expect(system.content).toContain("- turkey (Türkiye)");
    expect(user.content).toContain("kurucuları");
  });

  it("yalnızca bilinen kodları kabul eder, uydurma değerleri atar", () => {
    const f = toFilters(raw({ kisi_turleri: ["sahip", "uydurma"], ulke: "atlantis", sektorler: ["Retail", "Nope"], calisan_araliklari: ["1-10", "999"], unvanlar: ["Mağaza Müdürü", "x"] }));
    expect(f.roles).toEqual(["sahip"]);
    expect(f.country).toBe("turkey");
    expect(f.industries).toEqual(["Retail"]);
    expect(f.sizes).toEqual(["1-10"]);
    expect(f.titles).toEqual(["Mağaza Müdürü"]);
  });

  it("şehri, ülkeyi ve anahtar kelimeleri düzenler; çıktı arama şemasını geçer", () => {
    const f = toFilters(raw({ kisi_turleri: ["ust"], ulke: "germany", sehir: " Berlin ", anahtar_kelimeler: ["E-Commerce", "e-commerce", "a"] }));
    expect(f).toMatchObject({ country: "germany", city: "Berlin", keywords: ["e-commerce"] });
    expect(leadSearchSchema.safeParse({ ...f, count: 25 }).success).toBe(true);
  });

  it("sınırları uygular", () => {
    const f = toFilters(raw({ unvanlar: ["a1", "b2", "c3", "d4", "e5", "f6"], anahtar_kelimeler: ["aa", "bb", "cc", "dd"] }));
    expect(f.titles).toHaveLength(4);
    expect(f.keywords).toHaveLength(3);
  });
});
