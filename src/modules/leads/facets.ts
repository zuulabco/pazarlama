import { fold } from "@/lib/text";
import { leadSorts, type LeadSort, type Presence } from "./sorts";

/** Sonuç filtreleri (adres çubuğundaki parametreler). */
export type FacetFilters = {
  min?: 50 | 70 | 85;
  dn?: 60 | 80;
  web?: Presence;
  tel?: Presence;
  star?: 4 | 4.5;
  rev?: 50 | 200 | 500;
  rc?: 60 | 80;
  /** Semt / ilçe (firmanın `city` değeri). */
  d?: string;
};

export type FacetKey = keyof FacetFilters;
export const facetKeys: readonly FacetKey[] = ["min", "dn", "web", "tel", "star", "rev", "rc", "d"];

/** Süzme ve sayım için gereken firma alanları. */
export type FacetLead = {
  lead_score: number | null;
  digital_need: number | null;
  reachability: number | null;
  priority: number | null;
  rating: number | null;
  review_count: number | null;
  website: string | null;
  phone: string | null;
  city: string | null;
};

const sameDistrict = (a: string | null, b: string) => fold(a ?? "") === fold(b);

export function matchesFilters(l: FacetLead, f: FacetFilters): boolean {
  if (f.min !== undefined && (l.lead_score ?? 0) < f.min) return false;
  if (f.dn !== undefined && (l.digital_need ?? 0) < f.dn) return false;
  if (f.rc !== undefined && (l.reachability ?? 0) < f.rc) return false;
  if (f.star !== undefined && (l.rating ?? 0) < f.star) return false;
  if (f.rev !== undefined && (l.review_count ?? 0) < f.rev) return false;
  if (f.web && Boolean(l.website) !== (f.web === "var")) return false;
  if (f.tel && Boolean(l.phone) !== (f.tel === "var")) return false;
  if (f.d && !sameDistrict(l.city, f.d)) return false;
  return true;
}

/** Süzer ve seçilen ölçüte göre (eşitlikte genel skora göre) azalan sıralar. */
export function filterAndSort<T extends FacetLead>(leads: readonly T[], f: FacetFilters, sort: LeadSort): T[] {
  const col = leadSorts[sort].column as keyof FacetLead;
  return leads
    .filter((l) => matchesFilters(l, f))
    .sort((a, b) => ((b[col] as number | null) ?? 0) - ((a[col] as number | null) ?? 0) || (b.lead_score ?? 0) - (a.lead_score ?? 0));
}

export type Facets = {
  /** Mevcut filtrelerle eşleşen firma sayısı. */
  matching: number;
  /** Her filtre için: "Hepsi" ve her seçenek, DİĞER filtreler korunarak kaç firma getirir. */
  counts: Record<Exclude<FacetKey, "d">, { all: number; options: Record<string, number> }>;
  /** Semtler ve (diğer filtrelerle) firma sayıları; en kalabalık önce. */
  districts: { name: string; count: number }[];
  /** Semt süzgeci hariç, diğer filtrelerle eşleşen firma sayısı ("Tüm semtler"). */
  districtAll: number;
  /** Aramanın filtresiz özeti (sonuç başlığında gösterilir). */
  summary: { total: number; avgScore: number; noWebsite: number };
};

const options: Record<Exclude<FacetKey, "d">, readonly (string | number)[]> = {
  web: ["var", "yok"],
  tel: ["var", "yok"],
  min: [50, 70, 85],
  dn: [60, 80],
  rc: [60, 80],
  star: [4, 4.5],
  rev: [50, 200, 500],
};

/**
 * Apollo tarzı filtre sayıları: bir seçeneğe tıklanırsa kaç firma kalacağını gösterir. Sayılar,
 * o filtre hariç diğer tüm etkin filtreler korunarak hesaplanır.
 */
export function computeFacets(leads: readonly FacetLead[], f: FacetFilters): Facets {
  const without = (k: FacetKey): FacetFilters => {
    const copy = { ...f };
    delete copy[k];
    return copy;
  };
  const count = (filters: FacetFilters) => leads.filter((l) => matchesFilters(l, filters)).length;

  const counts = {} as Facets["counts"];
  for (const key of Object.keys(options) as (keyof typeof options)[]) {
    const base = without(key);
    counts[key] = {
      all: count(base),
      options: Object.fromEntries(options[key].map((o) => [String(o), count({ ...base, [key]: o })])),
    };
  }

  const byDistrict = new Map<string, { name: string; count: number }>();
  for (const l of leads.filter((x) => matchesFilters(x, without("d")))) {
    if (!l.city) continue;
    const key = fold(l.city);
    const entry = byDistrict.get(key) ?? { name: l.city, count: 0 };
    entry.count += 1;
    byDistrict.set(key, entry);
  }
  const districts = [...byDistrict.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr")).slice(0, 15);

  const scored = leads.filter((l) => l.lead_score !== null);
  const summary = {
    total: leads.length,
    avgScore: scored.length ? Math.round(scored.reduce((s, l) => s + (l.lead_score ?? 0), 0) / scored.length) : 0,
    noWebsite: leads.filter((l) => !l.website).length,
  };

  return { matching: count(f), counts, districts, districtAll: count(without("d")), summary };
}
