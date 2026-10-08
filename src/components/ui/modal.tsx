"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/** Kapanış animasyonunun süresi (ms); CSS'teki duration-200 ile aynı olmalı. */
const CLOSE_MS = 150;

/**
 * Açılır pencere (yerel <dialog>): odak penceredeyken kalır, Esc ve dışarı tıklama kapatır.
 * Açılış ve kapanış yumuşaktır (solma + hafif kayma); kapanırken son içerik animasyon bitene kadar görünür kalır.
 * İçerik yalnızca açıkken (ve kapanış animasyonu sürerken) bağlanır; böylece formlar her açılışta sıfırlanır.
 */
export function Modal({ open, onClose, title, children, width = "34rem" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  /** Açık pencerenin elemanı. Gizlenen sayfada React `ref`leri koparır; kapatabilmek için kendi kaydımız tutulur. */
  const held = useRef<HTMLDialogElement | null>(null);
  /** Pencereyi açan öğe: kapanınca odak ona (kaydırmadan) geri verilir. */
  const opener = useRef<HTMLElement | null>(null);

  /** Dialog DOM'da (açık ya da kapanış animasyonunda). */
  const [mounted, setMounted] = useState(open);
  /** Açılış animasyonu başladı (ilk karede false: geçişin başlangıç durumu). */
  const [entered, setEntered] = useState(false);
  /** Kapanış sürerken gösterilecek son içerik. */
  const [snap, setSnap] = useState({ children, title });

  if (open && !mounted) setMounted(true);
  if (open && (snap.children !== children || snap.title !== title)) setSnap({ children, title });

  const shown = open && entered;
  const content = open ? { children, title } : snap;

  useEffect(() => {
    const d = ref.current;
    if (!open || !mounted || !d) return;
    if (!d.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      d.showModal();
    }
    held.current = d;
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [open, mounted]);

  useEffect(() => {
    if (open || !mounted) return;
    const t = setTimeout(() => {
      // Eleman kaldırılınca üst katmandan da çıkar; yerel close() odak geri yüklerken sayfayı kaydırabildiği için kullanılmaz.
      setEntered(false);
      setMounted(false);
      requestAnimationFrame(() => opener.current?.focus({ preventScroll: true }));
    }, CLOSE_MS);
    return () => clearTimeout(t);
  }, [open, mounted]);

  // Sayfa gizlenirse (başka sayfaya geçilince önceki sayfa bellekte saklanır) ya da kaldırılırsa pencere üst katmandan çıkarılır;
  // aksi hâlde açık kalan yerel pencere tüm sayfayı tıklanamaz bırakır. Sayfa yeniden görününce efekt pencereyi tekrar açar.
  useEffect(() => {
    return () => {
      if (held.current?.open) held.current.close();
    };
  }, []);

  if (!mounted) return null;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      inert={!open}
      data-shown={shown}
      // Esc: yerel kapanış (anında) yerine üst bileşenin kapatmasıyla animasyonlu kapanış.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      style={{ width: `min(calc(100% - 2rem), ${width})` }}
      className="m-auto max-h-[calc(100svh-2rem)] max-w-full overflow-auto rounded-panel bg-surface p-0 text-ink opacity-0 shadow-xl ring-1 ring-line transition-[opacity,transform] duration-200 ease-out will-change-[opacity,transform] data-[shown=false]:duration-150 data-[shown=false]:ease-in backdrop:bg-ink/40 backdrop:opacity-0 backdrop:transition-opacity backdrop:duration-200 data-[shown=false]:backdrop:duration-150 data-[shown=true]:opacity-100 data-[shown=true]:backdrop:opacity-100 translate-y-3 scale-[0.98] data-[shown=true]:translate-y-0 data-[shown=true]:scale-100 motion-reduce:transition-none motion-reduce:backdrop:transition-none"
    >
      <div className="grid gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="min-w-0 text-lg font-semibold tracking-tight break-words">
            {content.title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Kapat" className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink">
            <span aria-hidden="true" className="text-xl leading-none">
              ×
            </span>
          </button>
        </div>
        {content.children}
      </div>
    </dialog>
  );
}
