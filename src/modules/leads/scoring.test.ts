import { describe, expect, it } from "vitest";
import { finalizeScores, type JevLike, type LeadFacts } from "./scoring";

const answer = (score: number, confidence = 0.5) => ({ score, confidence });
const jev = (s: number, overrides: Partial<JevLike> = {}): JevLike => ({
  sector_fit: answer(s),
  size_fit: answer(s),
  audience_fit: answer(s),
  service_need: answer(s),
  purchase_potential: answer(s),
  reachability: answer(s),
  priority: answer(s),
  ...overrides,
});
const facts: LeadFacts = { hasWebsite: true, hasPhone: true, claimed: true, closed: false };
const profile = {};

describe("finalizeScores", () => {
  it("JEV'in 0–4 puanını 0–100'e çevirir", () => {
    const r = finalizeScores(jev(4), facts, profile);
    expect(r.sector_fit).toBe(100);
    expect(r.company_size).toBe(100);
    expect(jev(2).sector_fit.score / 4).toBe(0.5);
    expect(finalizeScores(jev(2), facts, profile).sector_fit).toBe(50);
  });

  it("web sitesi olmayan firmanın dijital ihtiyacı artar", () => {
    const withSite = finalizeScores(jev(2), facts, profile);
    const noSite = finalizeScores(jev(2), { ...facts, hasWebsite: false }, profile);
    expect(noSite.digital_need).toBe(withSite.digital_need + 15);
  });

  it("sahiplenilmemiş profil dijital ihtiyacı biraz artırır", () => {
    const claimed = finalizeScores(jev(2), facts, profile);
    const unclaimed = finalizeScores(jev(2), { ...facts, claimed: false }, profile);
    expect(unclaimed.digital_need).toBe(claimed.digital_need + 5);
  });

  it("telefon ve web sitesi yoksa ulaşılabilirlik düşük kalır", () => {
    const r = finalizeScores(jev(4), { ...facts, hasPhone: false, hasWebsite: false, claimed: null }, profile);
    expect(r.reachability).toBeLessThanOrEqual(55);
    const reachable = finalizeScores(jev(4), facts, profile);
    expect(reachable.reachability).toBeGreaterThan(r.reachability);
  });

  it("skorlar 0–100 aralığında kalır", () => {
    const high = finalizeScores(jev(4), { ...facts, hasWebsite: false, claimed: false }, profile);
    for (const v of Object.values(high).filter((_, i) => i < 8)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    const low = finalizeScores(jev(-3), facts, profile);
    expect(low.sector_fit).toBe(0);
  });

  it("kapalı işletmenin skoru sıfırdır", () => {
    const r = finalizeScores(jev(4), { ...facts, closed: true }, profile);
    expect(r.lead_score).toBe(0);
    expect(r.priority).toBe(0);
  });

  it("profildeki ağırlıklar genel skoru etkiler", () => {
    // Dijital ihtiyacı yüksek, diğerleri düşük bir firma.
    const lead = jev(1, { service_need: answer(4) });
    const neutral = finalizeScores(lead, { ...facts, hasWebsite: false }, {});
    const digitalFocused = finalizeScores(lead, { ...facts, hasWebsite: false }, { signals: ["no-website", "weak-website", "low-social"] });
    expect(digitalFocused.lead_score).toBeGreaterThan(neutral.lead_score);
  });

  it("düşük güven skoru en fazla %10 düşürür", () => {
    const sure = finalizeScores(jev(3), facts, profile);
    const unsure = finalizeScores(
      {
        sector_fit: answer(3, 0),
        size_fit: answer(3, 0),
        audience_fit: answer(3, 0),
        service_need: answer(3, 0),
        purchase_potential: answer(3, 0),
        reachability: answer(3, 0),
        priority: answer(3, 0),
      },
      facts,
      profile,
    );
    expect(unsure.lead_score).toBeLessThan(sure.lead_score);
    expect(unsure.lead_score).toBeGreaterThanOrEqual(Math.round(sure.lead_score * 0.85));
  });

  it("aynı girdi her zaman aynı sonucu verir", () => {
    expect(finalizeScores(jev(2.3), facts, profile)).toEqual(finalizeScores(jev(2.3), facts, profile));
  });
});
