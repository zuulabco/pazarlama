"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import popover from "./popover.module.css";

export type RowMenuItem = { label: string; icon?: ReactNode; onClick?: () => void; href?: string; danger?: boolean; separatorBefore?: boolean };

const itemClass = "flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-sm transition-colors";

/**
 * Satır menüsü (üç nokta): tablo satırlarının sonunda eylemleri listeler. Menü, tablonun kaydırma alanı tarafından
 * kesilmesin diye düğmenin konumuna göre sabit (fixed) yerleştirilir; kaydırınca, dışarı tıklayınca ve Esc ile kapanır.
 */
export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointer = (e: PointerEvent) => !root.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function toggle() {
    if (!open && button.current) {
      const r = button.current.getBoundingClientRect();
      // Alt kenara sığmazsa menü düğmenin üstüne açılır.
      const below = window.innerHeight - r.bottom > items.length * 40 + 24;
      setPos({ top: below ? r.bottom + 4 : Math.max(r.top - items.length * 40 - 24, 8), right: Math.max(window.innerWidth - r.right, 8) });
    }
    setOpen((o) => !o);
  }

  return (
    <div ref={root} className="relative inline-block">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={toggle}
        className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink aria-expanded:bg-sunken aria-expanded:text-ink"
      >
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="currentColor">
          <circle cx="10" cy="4.5" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="15.5" r="1.5" />
        </svg>
      </button>
      <div
        id={id}
        role="menu"
        data-open={open}
        inert={!open}
        style={pos ? { top: pos.top, right: pos.right } : undefined}
        className={`${popover.popover} fixed z-50 w-48 origin-top-right rounded-panel bg-surface p-1.5 shadow-float ring-1 ring-line`}
      >
        {items.map((it) => {
          const content = (
            <>
              {it.icon && <span className="shrink-0 text-muted">{it.icon}</span>}
              {it.label}
            </>
          );
          const cls = `${itemClass} ${it.danger ? "text-danger hover:bg-danger-soft" : "hover:bg-sunken"}`;
          return (
            <div key={it.label}>
              {it.separatorBefore && <hr className="my-1 border-line" />}
              {it.href ? (
                <Link role="menuitem" href={it.href} onClick={() => setOpen(false)} className={cls}>
                  {content}
                </Link>
              ) : (
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    it.onClick?.();
                  }}
                  className={cls}
                >
                  {content}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
