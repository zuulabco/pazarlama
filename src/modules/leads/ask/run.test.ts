import { describe, expect, it, vi } from "vitest";
import type { Profile } from "@/modules/profile/repository";
import type { LeadRow } from "../repository";

// Dil modeli çağrılmamalı; çağrılırsa test başarısız olur.
vi.mock("@/lib/llm/nvidia", () => ({
  chatJson: vi.fn(() => {
    throw new Error("LLM çağrılmamalıydı");
  }),
  LlmUnavailableError: class extends Error {},
}));

const { answerQuestion } = await import("./run");

const lead = (i: number, over: Partial<LeadRow>): LeadRow => ({
  id: `id${i}`,
  search_id: "s",
  place_id: `p${i}`,
  name: `Firma ${i}`,
  category: "Diş kliniği",
  address: null,
  city: "Kadıköy",
  phone: "0216",
  website: null,
  maps_url: null,
  rating: 4.5,
  review_count: 100,
  raw: {},
  sector_fit: 50,
  company_size: 50,
  audience_fit: 50,
  digital_need: 50,
  purchase_potential: 50,
  reachability: 50,
  priority: 50,
  lead_score: 50,
  ...over,
});

const leads = [
  lead(1, { lead_score: 90, website: null }),
  lead(2, { lead_score: 70, website: "https://a.example", digital_need: 20 }),
  lead(3, { lead_score: 80, website: null, phone: null, city: "Bostancı" }),
  lead(4, { lead_score: 60, website: "https://b.example", rating: 3.9 }),
];
const profile = { businessName: "X", workType: "ajans", services: [], businessDescription: "" } as unknown as Profile;

describe("answerQuestion (LLM'siz yollar)", () => {
  it("süzgeç sorusunu gerçek verilerle yanıtlar ve skora göre sıralar", async () => {
    const r = await answerQuestion("web sitesi olmayan firmaları göster", leads, profile);
    expect(r.kind).toBe("list");
    expect(r.usedAi).toBe(false);
    expect(r.items.map((i) => i.name)).toEqual(["Firma 1", "Firma 3"]);
    expect(r.applied).toEqual(["Web sitesi yok"]);
  });

  it("birden fazla süzgeci birlikte uygular", async () => {
    const r = await answerQuestion("telefonu olan web sitesi olmayan firmalar", leads, profile);
    expect(r.items.map((i) => i.name)).toEqual(["Firma 1"]);
  });

  it("semt süzgeci", async () => {
    const r = await answerQuestion("Bostancı'daki firmaları göster", leads, profile);
    expect(r.items.map((i) => i.name)).toEqual(["Firma 3"]);
  });

  it("sayım sorusu ortalamaları hesaplar", async () => {
    const r = await answerQuestion("kaç firmanın web sitesi yok?", leads, profile);
    expect(r.kind).toBe("stats");
    expect(r.answer).toContain("2 firma var");
    expect(r.answer).toContain("%50");
    expect(r.items).toEqual([]);
  });

  it("uyan firma yoksa bunu söyler", async () => {
    const r = await answerQuestion("skoru 95 üstü firmalar", leads, profile);
    expect(r.items).toEqual([]);
    expect(r.answer).toContain("firma yok");
  });

  it("yorum sorusunda süzgeçten sonra aday kalmazsa modele gitmez", async () => {
    const r = await answerQuestion("skoru 95 üstü olanlardan hangisini aramalıyım?", leads, profile);
    expect(r.usedAi).toBe(false);
    expect(r.answer).toContain("firma yok");
  });
});

describe("sohbet cümleleri", () => {
  it("selamlaşma modele gitmeden Sinyal asistanı olarak yanıtlanır", async () => {
    for (const q of ["Merhaba", "selam!", "Günaydın", "merhaba nasılsın"]) {
      const r = await answerQuestion(q, leads, profile);
      expect(r.usedAi).toBe(false);
      expect(r.answer).toContain("Sinyal asistanıyım");
    }
  });

  it("teşekkürü karşılar", async () => {
    const r = await answerQuestion("teşekkürler", leads, profile);
    expect(r.answer).toContain("Rica ederim");
  });
});
