"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type Option = { readonly value: string; readonly label: string; readonly hint?: string };

const focusRing = "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest";

function Group({ legend, hint, error, children }: { legend?: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-3">
      {legend && (
        <legend className="mb-0.5 text-base font-medium">
          {legend}
          {hint && <span className="mt-0.5 block text-sm font-normal text-muted">{hint}</span>}
        </legend>
      )}
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

/** Açıklamalı seçenek kartları (çoklu seçim: checkbox). */
export function CardGroup({
  legend,
  name,
  options,
  value,
  onChange,
  error,
}: {
  legend?: string;
  name: string;
  options: readonly Option[];
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <Group legend={legend} error={error}>
      <div className="grid gap-2.5">
        {options.map((o) => {
          const checked = value.includes(o.value);
          return (
            <label key={o.value} className="relative cursor-pointer">
              <input type="checkbox" name={name} className="peer sr-only" checked={checked} onChange={() => toggle(o.value)} />
              <span
                data-checked={checked}
                className={`flex items-start gap-3.5 rounded-row px-4 py-3.5 ring-1 transition-[background-color,box-shadow,transform] duration-200 ring-inset select-none active:scale-[0.985] data-[checked=false]:bg-surface data-[checked=false]:ring-line-strong data-[checked=false]:hover:bg-sunken data-[checked=true]:bg-forest-soft data-[checked=true]:ring-2 data-[checked=true]:ring-forest ${focusRing}`}
              >
                <Indicator checked={checked} round={false} />
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

type PickerProps = {
  legend?: string;
  hint?: string;
  name: string;
  options: readonly Option[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Tek seçim (radyo) ya da çoklu seçim (checkbox). */
  single?: boolean;
  /** Listede olmayanı yazıp eklemeye izin verir. */
  allowCustom?: boolean;
  customLabel?: string;
  max?: number;
  /** Eklenen metni düzenler (örn. şehir adlarını baş harfi büyük yapmak). */
  normalize?: (text: string) => string;
  error?: string;
};

const eq = (a: string, b: string) => a.toLocaleLowerCase("tr") === b.toLocaleLowerCase("tr");

/** Hap görünümlü seçici: hazır seçenekler + isteğe bağlı serbest metin ekleme. */
export function ChipPicker({
  legend,
  hint,
  name,
  options,
  value,
  onChange,
  single = false,
  allowCustom = false,
  customLabel = "Listede yoksa yazıp ekleyin",
  max = 12,
  normalize = (t) => t,
  error,
}: PickerProps) {
  const id = useId();
  const [draft, setDraft] = useState("");

  // Kullanıcının yazdıkları da seçenek olarak görünür.
  const custom = value.filter((v) => !options.some((o) => o.value === v));
  const shown: Option[] = [...options, ...custom.map((c) => ({ value: c, label: c }))];

  const full = !single && value.length >= max;
  const text = normalize(draft.trim());

  function add() {
    if (text.length < 2 || full) return;
    // Yazılan, hazır bir seçeneğin adıyla aynıysa o seçenek seçilir.
    const known = shown.find((o) => eq(o.label, text) || eq(o.value, text));
    const next = known?.value ?? text;
    if (single) onChange([next]);
    else if (!value.includes(next)) onChange([...value, next]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault(); // formu göndermesin, eklesin
      add();
    }
  }

  const toggle = (v: string) => {
    if (single) return onChange([v]);
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <Group legend={legend} hint={hint} error={error}>
      <div className="flex flex-wrap gap-2">
        {shown.map((o) => {
          const checked = value.includes(o.value);
          return (
            <label key={o.value} className="relative cursor-pointer">
              <input
                type={single ? "radio" : "checkbox"}
                name={name}
                className="peer sr-only"
                checked={checked}
                onChange={() => toggle(o.value)}
              />
              <span
                data-checked={checked}
                className={`inline-flex min-h-11 items-center rounded-full px-5 py-2 leading-snug ring-1 transition-[background-color,color,transform] duration-200 ring-inset select-none active:scale-95 data-[checked=false]:bg-surface data-[checked=false]:ring-line-strong data-[checked=false]:hover:bg-sunken data-[checked=true]:bg-forest data-[checked=true]:text-white data-[checked=true]:ring-forest ${focusRing}`}
              >
                {o.label}
              </span>
            </label>
          );
        })}
      </div>

      {allowCustom && (
        <div className="mt-1 flex items-end gap-2">
          <div className="grid flex-1 gap-1.5">
            <label htmlFor={id} className="text-sm text-muted">
              {customLabel}
            </label>
            <input
              id={id}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={40}
              autoComplete="off"
              className="h-12 rounded-control bg-surface px-4 ring-1 ring-line-strong ring-inset outline-none focus:ring-2 focus:ring-forest"
            />
          </div>
          <Button variant="secondary" size="lg" onClick={add} disabled={text.length < 2 || full}>
            Ekle
          </Button>
        </div>
      )}
    </Group>
  );
}
