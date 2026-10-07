"use client";

import { useId, useState, type ReactNode } from "react";
import { Collapse } from "./collapse";

/**
 * Akordiyon: başlık düğmesi + yumuşakça açılan panel (Collapse). Site genelinde <details> yerine
 * bu kullanılır; çünkü <details> tarayıcıya göre anında açılır (bkz. DESIGN.md).
 */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  leading,
  className = "",
  buttonClassName = "",
  panelClassName = "",
}: {
  /** Başlık düğmesinin içeriği. */
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Başlığın solunda, düğmenin dışında duran etkileşimli öğe (örn. yıldız düğmesi). */
  leading?: ReactNode;
  className?: string;
  buttonClassName?: string;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={className}>
      <div className="flex items-center">
        {leading}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className={`group flex min-w-0 flex-1 items-center justify-between gap-4 text-left ${buttonClassName}`}
        >
          {summary}
          <svg
            viewBox="0 0 16 16"
            width="16"
            height="16"
            aria-hidden="true"
            className="shrink-0 text-muted transition-transform duration-300 group-aria-expanded:rotate-180"
          >
            <path d="m3.5 6 4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <Collapse open={open}>
        <div id={id} role="region" className={panelClassName}>
          {children}
        </div>
      </Collapse>
    </div>
  );
}
