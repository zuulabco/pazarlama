"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { Select } from "@/components/ui/select";
import type { FacetKey, Facets } from "@/modules/leads/facets";
import { leadSorts, type LeadSort } from "@/modules/leads/sorts";
import { AskBox } from "./ask-box";
import { RotatingTips } from "./rotating-tips";
import { ShapeLoader } from "./shape-loader";
import { filterKeys, isActiveStatus, type Navigate, type ResultFilters, type SearchView } from "./types";

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });
const POLL_MS = 1800;

type Live = { id: string; status: string; found: number; scored: number };

const filterLabels: Record<FacetKey, (f: ResultFilters) => string | null> = {
  min: (f) => (f.min ? `Genel skor ${f.min}+` : null),
  dn: (f) => (f.dn ? `Dijital ihtiyaç ${f.dn}+` : null),
  web: (f) => (f.web ? `Web sitesi ${f.web}` : null),
  tel: (f) => (f.tel ? `Telefon ${f.tel}` : null),
  star: (f) => (f.star ? `Google puanı ${String(f.star).replace(".", ",")}+` : null),
  rev: (f) => (f.rev ? `${f.rev}+ yorum` : null),
  rc: (f) => (f.rc ? `Ulaşılabilirlik ${f.rc}+` : null),
  d: (f) => f.d ?? null,
};

const bodyPlace = "order-3 min-w-0 lg:order-none lg:col-start-2 lg:row-start-2";

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid justify-items-center gap-2 text-center">
      <p className="text-lg font-semibold tracking-tight">{title}</p>
      <p className="max-w-[26rem] text-muted">{text}</p>
    </div>
  );
}

export function ResultsArea({
  search,
  filters,
  total,
  shown,
  waiting,
  pending,
  navigate,
  bodyRef,
  opening,
  hasHistory,
  summary,
  children,
}: {
  search: SearchView | null;
  filters: ResultFilters;
  /** Aramadaki süzgeçsiz skorlanmış firma sayısı. */
  total: number;
  /** Süzgeçlerden sonra listelenen firma sayısı. */
  shown: number;
  /** Arama gönderildi, sunucu yanıtı ya da yeni sayfa henüz gelmedi. */
  waiting: boolean;
  /** Süzgeç değişti, liste yenileniyor. */
  pending: boolean;
  navigate: Navigate;
  /** Geçmiş bir arama açılıyor (sunucudan getiriliyor). */
  opening: boolean;
  /** Kullanıcının daha önce yaptığı aramalar var. */
  hasHistory: boolean;
  /** Aramanın süzgeçsiz özeti. */
  summary: Facets["summary"];
  /** Gövde alanı; yeni arama gönderilince görünür alana kaydırmak için. */
  bodyRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const router = useRouter();
  const [live, setLive] = useState<Live | null>(null);

  const searchId = search?.id;
  const searchStatus = search?.status;

  // Arama sürerken durumu sorgular; sorgu işi bir adım da ilerletir. Yeni sonuç geldikçe liste yenilenir.
  useEffect(() => {
    if (!searchId || !searchStatus || !isActiveStatus(searchStatus)) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let signature = "";

    async function tick() {
      try {
        const res = await fetch(`/api/leads/searches/${searchId}`, { cache: "no-store" });
        if (res.ok) {
          const s = (await res.json()) as { status: string; found: number; scored: number };
          if (stopped) return;
          setLive({ id: searchId!, status: s.status, found: s.found, scored: s.scored });
          const next = `${s.status}:${s.scored}`;
          if (next !== signature) {
            signature = next;
            router.refresh();
          }
          if (s.status === "done" || s.status === "failed") return;
        }
      } catch {
        // Geçici bağlantı sorunu: bir sonraki turda tekrar denenir.
      }
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    }
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [searchId, searchStatus, router]);

  const view = search && live?.id === search.id ? { ...search, found: live.found, scored: live.scored } : search;
  const active = view ? isActiveStatus(view.status) : false;

  // 1) Arama gönderildi / geçmiş arama açılıyor / henüz hiç firma yok: ortada büyük yükleme animasyonu.
  if (waiting || opening || (view && active && view.scored === 0)) {
    const collecting = !view || view.found === 0;
    const title = opening ? "Arama açılıyor" : collecting ? "Firmalar aranıyor" : "Firmalar puanlanıyor";
    const text = opening
      ? "Kayıtlı sonuçlar getiriliyor."
      : collecting
        ? "Bölgenizdeki firmalar taranıyor. İlk firmalar birkaç saniye içinde listelenecek."
        : `${view!.found} firma bulundu, hedef profilinize göre puanlanıyor.`;
    return (
      <div ref={bodyRef} role="status" className={`${bodyPlace} grid min-h-[28rem] scroll-mt-6 place-items-center rounded-panel bg-surface px-6 py-16 ring-1 ring-line`}>
        <div className="grid justify-items-center gap-9">
          <ShapeLoader />
          <Message title={title} text={text} />
          <RotatingTips />
        </div>
      </div>
    );
  }

  // 2) Henüz seçili arama yok.
  if (!view) {
    return (
      <div ref={bodyRef} className={`${bodyPlace} grid min-h-[28rem] scroll-mt-6 place-items-center rounded-panel bg-surface px-6 py-16 ring-1 ring-line`}>
        <div className="grid justify-items-center gap-10">
          <Message
            title={hasHistory ? "Yeni bir arama yapın" : "İlk aramanızı başlatın"}
            text={
              hasHistory
                ? "Soldan firma türünü ve bölgeyi seçin. Önceki aramalarınıza soldaki “Son aramalar” bölümünden ulaşabilirsiniz."
                : "Soldan firma türünü ve bölgeyi seçin. Firmaları bulup hedef profilinize göre puanlayalım."
            }
          />
        </div>
      </div>
    );
  }

  const chips = filterKeys.map((k) => ({ key: k, label: filterLabels[k](filters) })).filter((c) => c.label);

  return (
    <div ref={bodyRef} className={`${bodyPlace} grid scroll-mt-6 gap-4`}>
      {/* Sonuç kartı: başlık, listenin ilk satırı gibi kartın içinde yer alır. */}
      <section className="rounded-panel bg-surface ring-1 ring-line">
        <header className="grid gap-4 border-b border-line px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-6">
          <div className="grid min-w-0 gap-3.5">
            <div className="grid min-w-0 gap-2.5">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                <h2 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{view.query}</h2>
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-sunken px-3 py-1 text-sm text-muted">
                  <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M8 14s4.5-3.9 4.5-7.3a4.5 4.5 0 1 0-9 0C3.5 10.1 8 14 8 14Z" />
                    <circle cx="8" cy="6.7" r="1.5" />
                  </svg>
                  <span className="truncate">{view.location}</span>
                </span>
              </div>
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted" aria-live="polite" aria-label="Arama özeti">
                <li>
                  <strong className="font-semibold text-ink tabular-nums">{total === shown ? total : `${shown} / ${total}`}</strong> firma
                </li>
                {summary.total > 0 && (
                  <li>
                    Ortalama skor <strong className="font-semibold text-ink tabular-nums">{summary.avgScore}</strong>
                  </li>
                )}
                {summary.noWebsite > 0 && (
                  <li>
                    <strong className="font-semibold text-ink tabular-nums">{summary.noWebsite}</strong> web sitesi yok
                  </li>
                )}
                <li>{dateFormat.format(new Date(view.createdAt))}</li>
              </ul>
            </div>
            {chips.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Uygulanan süzgeçler">
                {chips.map((c) => (
                  <li key={c.key}>
                    <button
                      type="button"
                      onClick={() => navigate((p) => p.delete(c.key))}
                      aria-label={`${c.label} süzgecini kaldır`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-forest-soft pr-2.5 pl-3.5 text-sm font-medium text-forest hover:bg-line"
                    >
                      {c.label}
                      <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                        <path d="m2.5 2.5 7 7m0-7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-2.5 text-sm text-muted sm:pt-1">
            <span aria-hidden="true">Sırala</span>
            <Select<LeadSort>
              label="Sırala"
              align="right"
              value={filters.sort}
              options={(Object.keys(leadSorts) as LeadSort[]).map((k) => ({ value: k, label: leadSorts[k].label }))}
              onChange={(next) => navigate((p) => (next === "score" ? p.delete("sort") : p.set("sort", next)))}
            />
          </div>
        </header>

        {active && (
          <div role="status" className="flex items-center gap-4 border-b border-line bg-forest-soft px-5 py-3.5">
            <ShapeLoader size="sm" />
            <p className="text-sm">
              <span className="font-medium">Firmalar toplanıp puanlanıyor…</span>{" "}
              <span className="text-muted">
                {view.scored} firma hazır{view.max > 0 ? ` (en fazla ${view.max})` : ""}. Yeni firmalar geldikçe liste güncellenir.
              </span>
            </p>
          </div>
        )}

        {view.status === "failed" && (
          <p role="alert" className="border-b border-line bg-danger-soft px-5 py-4 text-danger">
            {view.error ?? "Arama tamamlanamadı."} Yeni bir arama başlatabilirsiniz.
          </p>
        )}
        {view.status === "done" && view.error && <p className="border-b border-line px-5 py-3 text-sm text-muted">{view.error}</p>}

        <div className={`transition-opacity duration-200 ${pending ? "opacity-50" : ""}`} aria-busy={pending}>
          {children}
        </div>
      </section>

      {view.scored > 0 && <AskBox key={view.id} searchId={view.id} />}
      {view.scored > 0 && <div className="h-20" aria-hidden="true" />}
    </div>
  );
}
