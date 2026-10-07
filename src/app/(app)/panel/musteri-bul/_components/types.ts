import type { LeadSort, Presence } from "@/modules/leads/sorts";
import type { SearchStatus } from "@/modules/leads/repository";

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

/** Sonuç süzgeçleri; adres çubuğundaki parametrelerden okunur. */
export type ResultFilters = {
  min?: 50 | 70 | 85;
  dn?: 60 | 80;
  web?: Presence;
  tel?: Presence;
  star?: 4 | 4.5;
  sort: LeadSort;
};

export const filterKeys = ["min", "dn", "web", "tel", "star"] as const;

export const isActiveStatus = (s: SearchStatus) => s === "pending" || s === "scraping" || s === "scoring";

/** Süzgeç parametrelerini değiştiren yardımcı: adres çubuğundaki parametreleri günceller. */
export type Navigate = (mutate: (params: URLSearchParams) => void) => void;
