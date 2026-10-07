"use client";

import type { ReactNode } from "react";

export type Option = { readonly value: string; readonly label: string; readonly hint?: string };

const focusRing = "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest";

function Group({ legend, error, children }: { legend: string; error?: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      {children}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Çoklu seçim: erişilebilir checkbox'lar, hap görünümlü. */
export function ChipGroup({
  legend,
  options,
  value,
  onChange,
  error,
}: {
  legend: string;
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
                className={`inline-flex h-10 items-center rounded-full px-4 text-sm ring-1 ring-line-strong transition-colors ring-inset select-none data-[checked=false]:bg-surface data-[checked=false]:hover:bg-sunken data-[checked=true]:bg-forest data-[checked=true]:text-white data-[checked=true]:ring-forest ${focusRing}`}
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

/** Tekli seçim: erişilebilir radio'lar, açıklamalı kartlar. */
export function RadioCards({
  legend,
  name,
  options,
  value,
  onChange,
  error,
  columns = 1,
}: {
  legend: string;
  name: string;
  options: readonly Option[];
  value: string;
  onChange: (next: string) => void;
  error?: string;
  columns?: 1 | 2;
}) {
  return (
    <Group legend={legend} error={error}>
      <div className={`grid gap-2.5 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label key={o.value} className="relative cursor-pointer">
              <input
                type="radio"
                name={name}
                className="peer sr-only"
                checked={checked}
                onChange={() => onChange(o.value)}
              />
              <span
                data-checked={checked}
                className={`flex min-h-14 flex-col justify-center rounded-row px-4 py-3 ring-1 ring-inset transition-colors select-none data-[checked=false]:bg-surface data-[checked=false]:ring-line-strong data-[checked=false]:hover:bg-sunken data-[checked=true]:bg-forest-soft data-[checked=true]:ring-2 data-[checked=true]:ring-forest ${focusRing}`}
              >
                <span className="font-medium">{o.label}</span>
                {o.hint && <span className="text-sm text-muted">{o.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </Group>
  );
}
