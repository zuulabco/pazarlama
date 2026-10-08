"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Açılır pencere (yerel <dialog>): odak penceredeyken kalır, Esc ve dışarı tıklama kapatır.
 * İçerik `open` iken bağlanır; kapalıyken DOM'da yer tutmaz, böylece formlar her açılışta sıfırlanır.
 */
export function Modal({ open, onClose, title, children, width = "34rem" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      style={{ width: `min(calc(100% - 2rem), ${width})` }}
      className="m-auto max-h-[calc(100svh-2rem)] overflow-auto rounded-panel bg-surface p-0 text-ink shadow-xl ring-1 ring-line backdrop:bg-ink/40"
    >
      {open && (
        <div className="grid gap-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Kapat" className="-mt-1 -mr-1 grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink">
              <span aria-hidden="true" className="text-xl leading-none">
                ×
              </span>
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
