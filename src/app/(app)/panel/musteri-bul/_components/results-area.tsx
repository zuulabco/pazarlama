"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Select } from "@/components/ui/select";
import { leadSorts, type LeadSort } from "@/modules/leads/sorts";
import { AskBox } from "./ask-box";
import { RotatingTips } from "./rotating-tips";
import { ShapeLoader } from "./shape-loader";
import { filterKeys, isActiveStatus, type Navigate, type ResultFilters, type SearchView } from "./types";

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });
const POLL_MS = 1800;

type Live = { id: string; status: string; found: number; scored: number };

const filterLabels: Record<(typeof filterKeys)[number], (f: ResultFilters) => string | null> = {
  min: (f) => (f.min ? `Genel skor ${f.min}+` : null),
  dn: (f) => (f.dn ? `Dijital ihtiyaç ${f.dn}+` : null),
  web: (f) => (f.web ? `Web sitesi ${f.web}` : null),
  tel: (f) => (f.tel ? `Telefon ${f.tel}` : null),
  star: (f) => (f.star ? `Google puanı ${String(f.star).replace(".", ",")}+` : null),
};

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

  // 1) Arama gönderildi ya da henüz hiç firma yok: ortada büyük yükleme animasyonu.
  if (waiting || (view && active && view.scored === 0)) {
    const collecting = !view || view.found === 0;
    return (
      <div role="status" className="grid min-h-[28rem] place-items-center rounded-panel bg-surface px-6 py-16 ring-1 ring-line">
        <div className="grid justify-items-center gap-9">
          <ShapeLoader />
          <Message
            title={collecting ? "Firmalar aranıyor" : "Firmalar puanlanıyor"}
            text={
              collecting
                ? "Google Haritalar taranıyor. İlk firmalar birkaç saniye içinde listelenecek."
                : `${view!.found} firma bulundu, hedef profilinize göre puanlanıyor.`
            }
          />
          <RotatingTips />
        </div>
      </div>
    );
  }

  // 2) Henüz arama yok.
  if (!view) {
    return (
      <div className="grid min-h-[28rem] place-items-center rounded-panel bg-surface px-6 py-16 ring-1 ring-line">
        <div className="grid justify-items-center gap-10">
          <ShapeLoader />
          <Message
            title="İlk aramanızı başlatın"
            text="Soldan firma türünü ve bölgeyi seçin. Firmaları bulup hedef profilinize göre puanlayalım."
          />
        </div>
      </div>
    );
  }

  const chips = filterKeys.map((k) => ({ key: k, label: filterLabels[k](filters) })).filter((c) => c.label);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold tracking-tight">
            {view.query} · {view.location}
          </h2>
          <p className="text-sm text-muted" aria-live="polite">
            {dateFormat.format(new Date(view.createdAt))}
            {" · "}
            {total === shown ? `${total} firma` : `${total} firmadan ${shown}'i gösteriliyor`}
          </p>
        </div>
        <div className="flex items-center gap-2.5 text-sm text-muted">
          <span aria-hidden="true">Sırala</span>
          <Select<LeadSort>
            label="Sırala"
            align="right"
            value={filters.sort}
            options={(Object.keys(leadSorts) as LeadSort[]).map((k) => ({ value: k, label: leadSorts[k].label }))}
            onChange={(next) => navigate((p) => (next === "score" ? p.delete("sort") : p.set("sort", next)))}
          />
        </div>
      </div>

      {active && (
        <div role="status" className="flex items-center gap-4 rounded-panel bg-forest-soft px-5 py-3.5">
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
        <p role="alert" className="rounded-panel bg-danger-soft px-5 py-4 text-danger">
          {view.error ?? "Arama tamamlanamadı."} Yeni bir arama başlatabilirsiniz.
        </p>
      )}
      {view.status === "done" && view.error && <p className="text-sm text-muted">{view.error}</p>}

      {view.scored > 0 && <AskBox key={view.id} searchId={view.id} />}

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

      <div className={`transition-opacity duration-200 ${pending ? "opacity-50" : ""}`} aria-busy={pending}>
        {children}
      </div>
      {view.scored > 0 && <div className="h-24" aria-hidden="true" />}
    </div>
  );
}
