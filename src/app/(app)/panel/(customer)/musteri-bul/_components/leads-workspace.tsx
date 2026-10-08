"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import type { Facets } from "@/modules/leads/facets";
import { Toaster } from "@/components/ui/toast";
import { FiltersPanel } from "./filters-panel";
import { ResultsArea } from "./results-area";
import type { Navigate, ResultFilters, SearchView } from "./types";

/**
 * Müşteri Bul çalışma alanı: solda filtre paneli, sağda sonuçlar. İki taraf aynı durumu paylaşır;
 * "Firmaları bul" tıklandığı anda sağ taraf yükleme animasyonunu gösterir.
 */
export function LeadsWorkspace({
  search,
  searches,
  filters,
  total,
  shown,
  facets,
  defaults,
  children,
}: {
  search: SearchView | null;
  searches: SearchView[];
  filters: ResultFilters;
  total: number;
  shown: number;
  /** Filtre sayıları (Apollo tarzı). */
  facets: Facets;
  defaults: { query: string; province: string; district: string };
  /** Sunucuda çizilen firma listesi. */
  children: ReactNode;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [filtering, startFiltering] = useTransition();
  const [opening, startOpening] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(!search);
  const resultsRef = useRef<HTMLDivElement>(null);

  /** Filtre değişince adres çubuğunu günceller; liste sunucuda yeniden çizilir. */
  const navigate: Navigate = (mutate) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    startFiltering(() => router.replace(`/panel/musteri-bul?${next}`, { scroll: false }));
  };

  /** Geçmiş bir aramayı açar; sunucudan gelene kadar yükleme animasyonu gösterilir. */
  const openSearch = (id: string) => {
    setPanelOpen(false);
    startOpening(() => router.push(`/panel/musteri-bul?s=${id}`));
  };

  // Sayfa yeni oluşturulan aramaya ulaşınca bekleme biter. (Props değişince durumu render sırasında
  // düzeltmek, React'in önerdiği yöntemdir; efekt gerekmez.)
  const [seenId, setSeenId] = useState(search?.id ?? null);
  if ((search?.id ?? null) !== seenId) {
    setSeenId(search?.id ?? null);
    if (submitting && createdId && search?.id === createdId) setSubmitting(false);
  }
  const waiting = submitting;

  return (
    <>
      <Toaster />
      <div className="grid items-start gap-5 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-x-6 lg:gap-y-0 xl:gap-x-8">
      <ResultsArea
        search={search}
        filters={filters}
        total={total}
        shown={shown}
        waiting={waiting}
        pending={filtering}
        navigate={navigate}
        bodyRef={resultsRef}
        opening={opening}
        summary={facets.summary}
        hasHistory={searches.length > 0}
        presetProvince={defaults.province}
      >
        {children}
      </ResultsArea>

      <div className="order-2 grid gap-3 lg:order-none lg:col-start-1 lg:row-start-2">
        <button
          type="button"
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen((o) => !o)}
          className="flex h-11 items-center justify-between rounded-control bg-surface px-4 font-medium ring-1 ring-line-strong ring-inset lg:hidden"
        >
          Filtreler
          <span className="text-sm text-muted">{panelOpen ? "Gizle" : "Göster"}</span>
        </button>
        <div className={panelOpen ? "block" : "hidden lg:block"}>
          <FiltersPanel
            key={`${defaults.query}|${defaults.province}|${defaults.district}`}
            defaults={defaults}
            filters={filters}
            searches={searches}
            selectedId={search?.id ?? null}
            navigate={navigate}
            facets={total > 0 ? facets : null}
            onOpenSearch={openSearch}
            busy={waiting}
            onSubmitStart={() => {
              setSubmitting(true);
              setCreatedId(null);
              setPanelOpen(false);
              // Form uzunsa kullanıcı aşağıda kalır; yükleme animasyonunu görsün diye sonuç alanına kaydır.
              const el = resultsRef.current;
              if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            onCreated={(id) => {
              setCreatedId(id);
              router.push(`/panel/musteri-bul?s=${id}`);
              router.refresh();
            }}
            onFailed={() => {
              setSubmitting(false);
              setPanelOpen(true);
            }}
          />
        </div>
      </div>
    </div>
    </>
  );
}
