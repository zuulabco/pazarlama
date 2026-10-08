"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { createPortal } from "react-dom";
import type { AskItem, AskResult } from "@/modules/leads/ask/run";
import styles from "./ask-box.module.css";

const examples = [
  "Web sitesi olmayan firmaları göster",
  "Dijital ihtiyacı en yüksek ilk 3 firma",
  "Önce hangi firmayı aramalıyım ve neden?",
];

/** Dört köşeli pırıltı simgesi. */
function Sparkle({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
      <path d="M12 2.5c.5 4.6 2.4 7 7 7.5-4.6.5-6.5 2.9-7 7.5-.5-4.6-2.4-7-7-7.5 4.6-.5 6.5-2.9 7-7.5Z" />
      <path d="M19 15c.25 2.1 1.15 3 3 3.25-1.85.25-2.75 1.15-3 3.25-.25-2.1-1.15-3-3-3.25 1.85-.25 2.75-1.15 3-3.25Z" opacity=".85" />
    </svg>
  );
}

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
 * Sonuçlar hakkında soru kutusu: ekranın alt ortasında sabit, açılıp kapanabilen yapay zekâ girişi.
 * Filtre, sıralama ve sayım soruları sunucuda kurallarla ve gerçek verilerle yanıtlanır; yorum
 * soruları en iyi adaylar seçildikten sonra yapay zekâya gider. Yanıt, girişin üstünde açılır.
 */
export function AskBox({ searchId }: { searchId: string }) {
  const inputId = useId();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [dockOpen, setDockOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  // Escape: önce yanıt panelini, sonra kutuyu kapatır.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (panelOpen) setPanelOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  async function ask(text: string) {
    const q = text.trim();
    if (q.length < 3 || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setPanelOpen(true);
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

  const showExamples = !result && !error && !busy;

  // Sabit kutu, üstündeki atalardan (taşma, dönüşüm) etkilenmesin diye doğrudan body'ye çizilir.
  if (!mounted) return null;
  return createPortal(
    <>
      <div className={styles.dock}>
        <div className={styles.stack} data-open={dockOpen} inert={!dockOpen}>
          <section
            className={styles.panel}
            data-open={panelOpen && dockOpen}
            aria-label="Soru kutusu yanıtı"
            aria-live="polite"
          >
            <div className="grid gap-3.5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-muted">
                  {busy ? "Verilere bakılıyor…" : showExamples ? "Örnek sorular" : "Yanıt"}
                </p>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  aria-label="Yanıt panelini kapat"
                  className="rounded-control px-2 py-1 text-sm text-muted hover:text-ink"
                >
                  Kapat
                </button>
              </div>

              {showExamples && (
                <ul className="flex flex-wrap gap-2" aria-label="Örnek sorular">
                  {examples.map((ex) => (
                    <li key={ex}>
                      <button
                        type="button"
                        onClick={() => {
                          setQuestion(ex);
                          void ask(ex);
                        }}
                        className="h-8 rounded-full bg-sunken px-3.5 text-sm text-muted transition-colors hover:bg-forest-soft hover:text-accent"
                      >
                        {ex}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {error && (
                <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">
                  {error}
                </p>
              )}

              {result && !error && (
                <div className="grid gap-3.5">
                  <p className="whitespace-pre-line">{result.answer}</p>
                  {result.applied.length > 0 && (
                    <p className="text-sm text-muted">Uygulanan filtreler: {result.applied.join(" · ")}</p>
                  )}
                  {result.items.length > 0 && (
                    <ul className="divide-y divide-line">
                      {result.items.map((i) => (
                        <Item key={i.id} item={i} />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </section>

          <form onSubmit={onSubmit} className={styles.frame} data-busy={busy} role="search" aria-label="Sonuçlara soru sor">
            <div className={styles.field}>
              <label htmlFor={inputId} className="sr-only">
                Sonuçlara soru sor
              </label>
              <input
                id={inputId}
                ref={inputRef}
                value={question}
                maxLength={200}
                autoComplete="off"
                placeholder="Firmalar hakkında sor…"
                onFocus={() => setPanelOpen(true)}
                onChange={(e) => setQuestion(e.target.value)}
                className={styles.input}
              />
              <button
                type="button"
                onClick={() => {
                  setDockOpen(false);
                  setPanelOpen(false);
                }}
                aria-label="Soru kutusunu küçült"
                className={styles.collapseBtn}
              >
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="m3.5 6 4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="submit"
                disabled={busy || question.trim().length < 3}
                aria-label={busy ? "Yanıtlanıyor" : "Soruyu gönder"}
                data-busy={busy}
                className={styles.send}
              >
                <Sparkle />
              </button>
            </div>
          </form>
        </div>

        <button
          type="button"
          className={styles.fab}
          data-open={dockOpen}
          inert={dockOpen}
          aria-label="Soru kutusunu aç"
          onClick={() => {
            setDockOpen(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        >
          <Sparkle size={24} />
        </button>
      </div>
    </>,
    document.body,
  );
}
