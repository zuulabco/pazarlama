"use client";

import type { ReactNode } from "react";

export type Option = { readonly value: string; readonly label: string; readonly hint?: string };

const focusRing = "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest";

function Group({ legend, error, children }: { legend?: string; error?: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-3">
      {legend && <legend className="mb-1 text-base font-medium">{legend}</legend>}
      {children}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Seçildiğinde dolan işaret: radyo için daire, çoklu seçim için yuvarlak kare. */
function Indicator({ checked, round }: { checked: boolean; round: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-checked={checked}
      className={`mt-0.5 grid size-5 shrink-0 place-items-center ring-1 transition-colors ring-inset data-[checked=false]:bg-surface data-[checked=false]:ring-line-strong data-[checked=true]:bg-forest data-[checked=true]:ring-forest ${round ? "rounded-full" : "rounded-md"}`}
    >
      <svg viewBox="0 0 12 12" width="12" height="12" className={checked ? "opacity-100" : "opacity-0"}>
        <path d="m2.5 6.2 2.2 2.2 4.8-5" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** Seçenek kartı. Çoklu seçimde checkbox, tekli seçimde radio (gerçek input'lar, klavye dostu). */
export function CardGroup({
  legend,
  name,
  options,
  value,
  onChange,
  multiple = false,
  columns = 1,
  error,
}: {
  legend?: string;
  name: string;
  options: readonly Option[];
  value: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
  columns?: 1 | 2;
  error?: string;
}) {
  const pick = (v: string) => {
    if (!multiple) return onChange([v]);
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <Group legend={legend} error={error}>
      <div className={`grid gap-2.5 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
        {options.map((o) => {
          const checked = value.includes(o.value);
          return (
            <label key={o.value} className="relative cursor-pointer">
              <input
                type={multiple ? "checkbox" : "radio"}
                name={name}
                className="peer sr-only"
                checked={checked}
                onChange={() => pick(o.value)}
              />
              <span
                data-checked={checked}
                className={`flex items-start gap-3.5 rounded-row px-4 py-3.5 ring-1 transition-[background-color,box-shadow,transform] duration-200 ring-inset select-none active:scale-[0.985] data-[checked=false]:bg-surface data-[checked=false]:ring-line-strong data-[checked=false]:hover:bg-sunken data-[checked=true]:bg-forest-soft data-[checked=true]:ring-2 data-[checked=true]:ring-forest ${focusRing}`}
              >
                <Indicator checked={checked} round={!multiple} />
                <span className="grid gap-0.5">
                  <span className="leading-snug font-medium">{o.label}</span>
                  {o.hint && <span className="text-sm leading-snug text-muted">{o.hint}</span>}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </Group>
  );
}

/** Kısa seçenekler için hap görünümlü çoklu seçim. */
export function ChipGroup({
  legend,
  options,
  value,
  onChange,
  error,
}: {
  legend?: string;
  options: readonly Option[];
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <Group legend={legend} error={error}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = value.includes(o.value);
          return (
            <label key={o.value} className="relative cursor-pointer">
              <input type="checkbox" className="peer sr-only" checked={checked} onChange={() => toggle(o.value)} />
              <span
                data-checked={checked}
                className={`inline-flex h-11 items-center rounded-full px-5 ring-1 transition-[background-color,color,transform] duration-200 ring-inset select-none active:scale-95 data-[checked=false]:bg-surface data-[checked=false]:ring-line-strong data-[checked=false]:hover:bg-sunken data-[checked=true]:bg-forest data-[checked=true]:text-white data-[checked=true]:ring-forest ${focusRing}`}
              >
                {o.label}
              </span>
            </label>
          );
        })}
      </div>
    </Group>
  );
}
