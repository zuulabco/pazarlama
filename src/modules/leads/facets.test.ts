import { describe, expect, it } from "vitest";
import { computeFacets, filterAndSort, matchesFilters, type FacetLead } from "./facets";

const lead = (over: Partial<FacetLead>): FacetLead => ({
  lead_score: 50,
  digital_need: 50,
  reachability: 50,
  priority: 50,
  rating: 4.2,
  review_count: 100,
  website: null,
  phone: "0216",
  city: "Kadıköy",
  ...over,
});

const leads = [
  lead({ lead_score: 90, website: null, review_count: 600 }),
  lead({ lead_score: 70, website: "https://a.example", digital_need: 80 }),
  lead({ lead_score: 80, website: null, phone: null, city: "Bostancı", rating: 4.8 }),
  lead({ lead_score: 40, website: "https://b.example", city: "Bostancı", rating: 3.5, review_count: 20 }),
];

describe("matchesFilters", () => {
  it("tüm filtreleri birlikte uygular", () => {
    expect(leads.filter((l) => matchesFilters(l, { web: "yok", tel: "var" }))).toHaveLength(1);
    expect(leads.filter((l) => matchesFilters(l, { rev: 200 }))).toHaveLength(1);
    expect(leads.filter((l) => matchesFilters(l, { d: "bostanci" }))).toHaveLength(2);
    expect(leads.filter((l) => matchesFilters(l, { star: 4.5 }))).toHaveLength(1);
  });
});

describe("filterAndSort", () => {
  it("skora göre azalan sıralar", () => {
    expect(filterAndSort(leads, {}, "score").map((l) => l.lead_score)).toEqual([90, 80, 70, 40]);
  });
  it("seçilen ölçüte göre sıralar, eşitlikte skora bakar", () => {
    expect(filterAndSort(leads, {}, "digital")[0].digital_need).toBe(80);
  });
});

describe("computeFacets", () => {
  it("bir seçeneğin getireceği sayıyı, diğer filtreler korunarak verir", () => {
    const f = computeFacets(leads, { web: "yok" });
    expect(f.matching).toBe(2);
    // web süzgeci hariç tutulur: Var=2, Yok=2
    expect(f.counts.web.options).toEqual({ var: 2, yok: 2 });
    expect(f.counts.web.all).toBe(4);
    // diğer filtreler web=yok ile birlikte hesaplanır
    expect(f.counts.tel.options).toEqual({ var: 1, yok: 1 });
    expect(f.counts.min.options["85"]).toBe(1);
  });

  it("semtleri en kalabalık önce, filtrelerle birlikte sayar", () => {
    expect(computeFacets(leads, {}).districts).toEqual([
      { name: "Bostancı", count: 2 },
      { name: "Kadıköy", count: 2 },
    ]);
    expect(computeFacets(leads, { web: "yok" }).districts).toEqual([
      { name: "Bostancı", count: 1 },
      { name: "Kadıköy", count: 1 },
    ]);
  });
});
