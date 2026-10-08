"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import popover from "./popover.module.css";

export type SelectOption<T extends string> = { value: T; label: string; hint?: string };

/**
 * Modern açılır menü (yerel <select> yerine): yumuşak açılıp kapanır, klavyeyle tam kullanılır.
 * ARIA "select-only combobox" kalıbı: düğme odakta kalır, seçenekler listbox içindedir.
 */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
  align = "left",
}: {
  /** Erişilebilir ad ve (isteğe bağlı) görünür etiket. */
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (next: T) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const current = options[selectedIndex];
  const highlight = active >= 0 ? active : selectedIndex;

  function choose(index: number) {
    onChange(options[index].value);
    setOpen(false);
    setActive(-1);
    buttonRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const last = options.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) return setOpen(true);
        setActive(Math.min(last, highlight + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) return setOpen(true);
        setActive(Math.max(0, highlight - 1));
        break;
      case "Home":
        if (open) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          setActive(last);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) choose(highlight);
        else setOpen(true);
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
          setActive(-1);
        }
        break;
    }
  }

  return (
    <div
      className={`relative min-w-40 ${className}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
          setActive(-1);
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-opt-${highlight}` : undefined}
        onClick={() => {
          setOpen((o) => !o);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
        className="flex h-10 w-full min-w-40 items-center justify-between gap-3 rounded-control bg-surface px-3.5 text-left text-base ring-1 ring-line-strong transition-shadow ring-inset outline-none hover:bg-sunken/60 focus-visible:ring-2 focus-visible:ring-forest aria-expanded:ring-2 aria-expanded:ring-forest"
      >
        <span className="truncate">{current?.label}</span>
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          aria-hidden="true"
          className={`shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="m3.5 6 4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        data-open={open}
        className={`${popover.popover} absolute top-full z-30 mt-2 min-w-full rounded-row bg-surface p-1.5 shadow-float ring-1 ring-line-strong ${align === "right" ? "right-0" : "left-0"}`}
      >
        <ul id={`${id}-list`} role="listbox" aria-label={label} className="grid gap-0.5">
          {options.map((o, i) => {
            const selected = o.value === value;
            return (
              <li
                key={o.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={selected}
                data-active={i === highlight}
                onPointerDown={(e) => e.preventDefault()} // düğme odağını kaybetmesin
                onClick={() => choose(i)}
                onMouseMove={() => setActive(i)}
                className="flex cursor-pointer items-center justify-between gap-6 rounded-control px-3 py-2.5 whitespace-nowrap data-[active=true]:bg-sunken"
              >
                <span className="grid">
                  <span className={selected ? "font-medium" : undefined}>{o.label}</span>
                  {o.hint && <span className="text-sm text-muted">{o.hint}</span>}
                </span>
                {selected && (
                  <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true" className="shrink-0 text-accent">
                    <path d="m2.5 6.2 2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
