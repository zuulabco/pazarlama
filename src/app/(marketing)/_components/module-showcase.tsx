"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ModulePreview } from "@/components/showcase/previews";
import styles from "@/components/showcase/showcase.module.css";
import type { AppModule } from "@/modules/registry";

/**
 * Özellik seçim alanı: solda modül sekmeleri, sağda seçilen modülün animasyonlu önizlemesi.
 * Klavyeyle (ok tuşları, Home, End) gezilebilir; hareket azaltma ayarına uyar.
 */
export function ModuleShowcase({ modules }: { modules: readonly AppModule[] }) {
  const [active, setActive] = useState(0);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const current = modules[active];

  function select(i: number) {
    setActive(i);
    tabsRef.current[i]?.focus();
  }
  function onKey(e: KeyboardEvent) {
    const n = modules.length;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") select((active + 1) % n);
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") select((active - 1 + n) % n);
    else if (e.key === "Home") select(0);
    else if (e.key === "End") select(n - 1);
    else return;
    e.preventDefault();
  }

  return (
    <div className="mt-12 grid gap-6 lg:grid-cols-[20rem_1fr] lg:gap-8">
      <div
        role="tablist"
        aria-label="Adspine özellikleri"
        aria-orientation="vertical"
        onKeyDown={onKey}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:grid lg:content-start lg:gap-1.5 lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {modules.map((m, i) => {
          const selected = i === active;
          return (
            <button
              key={m.id}
              ref={(el) => {
                tabsRef.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${m.id}`}
              aria-selected={selected}
              aria-controls="module-stage"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              className={`${styles.tab} flex shrink-0 items-center justify-between gap-4 rounded-row px-4 py-3.5 text-left whitespace-nowrap lg:whitespace-normal ${
                selected ? "bg-surface text-ink shadow-float ring-1 ring-line" : "text-muted hover:bg-surface/60 hover:text-ink"
              }`}
            >
              <span className="font-medium">{m.name}</span>
              <span
                className={`hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:inline ${
                  m.status === "ready" ? "bg-forest text-white" : "bg-sunken text-muted"
                }`}
              >
                {m.status === "ready" ? "Hazır" : "Yakında"}
              </span>
            </button>
          );
        })}
      </div>

      <div id="module-stage" role="tabpanel" aria-labelledby={`tab-${current.id}`} className={`${styles.stage} min-h-[28rem] p-6 sm:p-9`}>
        <div key={current.id} className={`${styles.enter} grid gap-8`}>
          <div className="max-w-[34rem]">
            <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              {current.status === "ready" ? "Kullanılabilir" : "Yakında · önizleme"}
            </span>
            <h3 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">{current.name}</h3>
            <p className="mt-2 text-white/80">{current.description}</p>
          </div>
          <div className="max-w-[38rem]" aria-hidden="true">
            <ModulePreview id={current.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
