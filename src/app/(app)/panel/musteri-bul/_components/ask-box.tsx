"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Collapse } from "@/components/ui/collapse";
import type { AskItem, AskResult } from "@/modules/leads/ask/run";
import { ShapeLoader } from "./shape-loader";

const examples = [
  "Web sitesi olmayan firmaları göster",
  "Dijital ihtiyacı en yüksek ilk 3 firma",
  "Önce hangi firmayı aramalıyım ve neden?",
];

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink tabular-nums">{value}</span>
    </span>
  );
}

function Item({ item }: { item: AskItem }) {
  return (
    <li className="grid gap-1 py-3.5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-medium">{item.name}</p>
        <p className="flex flex-wrap gap-x-3.5 text-sm">
          <Meter label="Skor" value={item.score} />
          <Meter label="Dijital" value={item.digital} />
          <Meter label="Ulaşılabilirlik" value={item.reach} />
        </p>
      </div>
      <p className="text-sm text-muted">
        {[item.category, item.district, item.rating ? `${String(item.rating).replace(".", ",")} puan` : null, item.reviews ? `${item.reviews} yorum` : null]
          .filter(Boolean)
          .join(" · ")}
        {!item.hasWeb && " · Web sitesi yok"}
        {!item.hasPhone && " · Telefon yok"}
      </p>
      {item.note && <p className="text-sm">{item.note}</p>}
    </li>
  );
}

/**
 * Sonuçlar hakkında soru kutusu. Süzgeç, sıralama ve sayım soruları sunucuda kurallarla ve gerçek
 * verilerle yanıtlanır; yorum soruları en iyi adaylar seçildikten sonra yapay zekâya gider.
 */
export function AskBox({ searchId }: { searchId: string }) {
  const inputId = useId();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const controller = useRef<AbortController | null>(null);

  async function ask(text: string) {
    const q = text.trim();
    if (q.length < 3 || busy) return;
    setBusy(true);
    setError(null);
    controller.current?.abort();
    const ac = (controller.current = new AbortController());
    try {
      const res = await fetch("/api/leads/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchId, question: q }),
        signal: ac.signal,
      });
      const body = (await res.json().catch(() => null)) as (AskResult & { error?: string }) | null;
      if (!res.ok || !body || body.error) {
        setError(body?.error ?? "Soru yanıtlanamadı. Tekrar deneyin.");
        return;
      }
      setResult(body);
      setOpen(true);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError("Bağlantı kurulamadı. Tekrar deneyin.");
    } finally {
      if (controller.current === ac) setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(question);
  }

  return (
    <section aria-labelledby={`${inputId}-title`} className="grid gap-3.5 rounded-panel bg-surface p-5 ring-1 ring-line">
      <div>
        <h3 id={`${inputId}-title`} className="font-semibold tracking-tight">
          Sonuçlara soru sor
        </h3>
        <p className="text-sm text-muted">
          Süzgeç, sıralama ve sayı sorularını anında yanıtlarız. “Neden”, “nasıl” gibi yorum sorularında en iyi adayları yapay zekâ değerlendirir.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-2.5 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">
          Sorunuz
        </label>
        <input
          id={inputId}
          value={question}
          maxLength={200}
          placeholder="Örn. Telefonu olan ama web sitesi olmayan firmalar"
          onChange={(e) => setQuestion(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-control bg-surface px-4 text-base text-ink ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest"
        />
        <Button type="submit" disabled={busy || question.trim().length < 3}>
          {busy ? "Yanıtlanıyor…" : "Sor"}
        </Button>
      </form>

      <ul className="flex flex-wrap gap-2" aria-label="Örnek sorular">
        {examples.map((ex) => (
          <li key={ex}>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setQuestion(ex);
                void ask(ex);
              }}
              className="h-8 rounded-full bg-sunken px-3.5 text-sm text-muted transition-colors hover:bg-forest-soft hover:text-forest disabled:opacity-50"
            >
              {ex}
            </button>
          </li>
        ))}
      </ul>

      {busy && (
        <div role="status" className="flex items-center gap-3.5 rounded-control bg-forest-soft px-4 py-3">
          <ShapeLoader size="sm" />
          <p className="text-sm">Verilere bakılıyor…</p>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Collapse open={open && result !== null}>
        {result && (
          <div className="grid gap-3.5 rounded-control bg-sunken p-4" aria-live="polite">
            <div className="flex items-start justify-between gap-4">
              <p className="whitespace-pre-line">{result.answer}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Yanıtı kapat"
                className="shrink-0 rounded-control px-2 py-1 text-sm text-muted hover:text-ink"
              >
                Kapat
              </button>
            </div>
            {result.applied.length > 0 && (
              <p className="text-sm text-muted">Uygulanan süzgeçler: {result.applied.join(" · ")}</p>
            )}
            {result.items.length > 0 && <ul className="divide-y divide-line">{result.items.map((i) => <Item key={i.id} item={i} />)}</ul>}
            <p className="text-xs text-muted">
              {result.usedAi
                ? "Bu yanıt yapay zekâ ile yorumlandı; skorlar ve veriler arama sonuçlarından alındı."
                : "Bu yanıt doğrudan arama verilerinden hesaplandı."}
            </p>
          </div>
        )}
      </Collapse>
    </section>
  );
}
