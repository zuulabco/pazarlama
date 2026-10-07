"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type State = { status: string; found: number; scored: number; error: string | null };

const POLL_MS = 3000;

/** Arama sürerken durumu sorgular; sorgu, işi bir adım da ilerletir. Bitince sayfayı yeniler. */
export function SearchProgress({ id, initial }: { id: string; initial: State }) {
  const router = useRouter();
  const [state, setState] = useState<State>(initial);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      try {
        const res = await fetch(`/api/leads/searches/${id}`, { cache: "no-store" });
        if (res.ok) {
          const next = (await res.json()) as State;
          if (stopped) return;
          setState(next);
          if (next.status === "done" || next.status === "failed") {
            router.refresh();
            return;
          }
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
  }, [id, router]);

  const scoring = state.status === "scoring";
  const ratio = scoring && state.found > 0 ? state.scored / state.found : 0;

  return (
    <div role="status" className="rounded-panel bg-surface p-6 ring-1 ring-line sm:p-8">
      <p className="font-medium">{scoring ? "Firmalar puanlanıyor…" : "Firmalar toplanıyor…"}</p>
      <p className="mt-1 text-sm text-muted">
        {scoring
          ? `${state.scored} / ${state.found} firma puanlandı.`
          : "Google Haritalar'dan firmalar çekiliyor. Bu genellikle yarım dakikadan kısa sürer."}
      </p>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
        <div
          className={`h-full rounded-full bg-forest transition-[width] duration-500 ${scoring ? "" : "w-1/3 animate-pulse motion-reduce:animate-none"}`}
          style={scoring ? { width: `${Math.max(6, ratio * 100)}%` } : undefined}
        />
      </div>
    </div>
  );
}
