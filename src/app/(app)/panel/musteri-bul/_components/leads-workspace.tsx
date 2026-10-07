"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { FiltersPanel } from "./filters-panel";
import { ResultsArea } from "./results-area";
import type { Navigate, ResultFilters, SearchView } from "./types";

/**
 * Müşteri Bul çalışma alanı: solda süzgeç paneli, sağda sonuçlar. İki taraf aynı durumu paylaşır;
 * "Firmaları bul" tıklandığı anda sağ taraf yükleme animasyonunu gösterir.
 */
export function LeadsWorkspace({
  search,
  searches,
  filters,
  total,
  shown,
  defaults,
  children,
}: {
  search: SearchView | null;
  searches: SearchView[];
  filters: ResultFilters;
  total: number;
  shown: number;
  defaults: { province: string; district: string };
  /** Sunucuda çizilen firma listesi. */
  children: ReactNode;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [filtering, startFiltering] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(!search);
  const resultsRef = useRef<HTMLDivElement>(null);

  /** Süzgeç değişince adres çubuğunu günceller; liste sunucuda yeniden çizilir. */
  const navigate: Navigate = (mutate) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    startFiltering(() => router.replace(`/panel/musteri-bul?${next}`, { scroll: false }));
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
    <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] xl:gap-8">
      <div className="grid gap-3">
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
            defaults={defaults}
            filters={filters}
            searches={searches}
            selectedId={search?.id ?? null}
            navigate={navigate}
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

      <div ref={resultsRef} className="min-w-0 scroll-mt-6">
      <ResultsArea
        search={search}
        filters={filters}
        total={total}
        shown={shown}
        waiting={waiting}
        pending={filtering}
        navigate={navigate}
      >
        {children}
      </ResultsArea>
      </div>
    </div>
  );
}
