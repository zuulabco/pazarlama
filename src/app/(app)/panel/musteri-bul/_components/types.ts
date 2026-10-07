import { facetKeys, type FacetFilters } from "@/modules/leads/facets";
import type { SearchStatus } from "@/modules/leads/repository";
import type { LeadSort } from "@/modules/leads/sorts";

/** Sunucudan istemciye geçen (serileştirilebilir) arama özeti. */
export type SearchView = {
  id: string;
  query: string;
  location: string;
  status: SearchStatus;
  found: number;
  scored: number;
  max: number;
  error: string | null;
  createdAt: string;
};

/** Sonuç süzgeçleri ve sıralama; adres çubuğundaki parametrelerden okunur. */
export type ResultFilters = FacetFilters & { sort: LeadSort };

export const filterKeys = facetKeys;

export const isActiveStatus = (s: SearchStatus) => s === "pending" || s === "scraping" || s === "scoring";

/** Süzgeç parametrelerini değiştiren yardımcı: adres çubuğundaki parametreleri günceller. */
export type Navigate = (mutate: (params: URLSearchParams) => void) => void;
