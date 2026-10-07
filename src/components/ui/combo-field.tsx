"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { capitalize, fold } from "@/lib/text";
import styles from "./combo-field.module.css";

export type Option = { readonly value: string; readonly label: string; readonly hint?: string };

type Props = {
  legend: string;
  hint?: string;
  options: readonly Option[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Tek seçim: yeni seçim öncekinin yerine geçer. */
  single?: boolean;
  /** Listede olmayanı yazıp eklemeye izin verir. */
  allowCustom?: boolean;
  placeholder?: string;
  /** Seçilemez: örn. il seçilmeden ilçe. */
  disabled?: boolean;
  max?: number;
  /** Yazılan metni düzenler (örn. şehir adlarında baş harfi büyütmek). */
  normalize?: (text: string) => string;
  error?: string;
};

type Item = { kind: "option"; option: Option } | { kind: "custom"; text: string };

/**
 * Açılır öneri listeli seçici (ARIA combobox). Alana tıklayınca öneriler açılır, yazdıkça süzülür;
 * seçilenler alanın içinde etiket olarak birikir. Listede olmayan, yazılıp eklenebilir.
 */
export function ComboField({
  legend,
  hint,
  options,
  value,
  onChange,
  single = false,
  allowCustom = false,
  placeholder,
  disabled = false,
  max = 12,
  // Kullanıcının yazdıkları büyük harfle başlar; böylece hazır seçeneklerin (küçük harfli) kodlarıyla karışmaz.
  normalize = capitalize,
  error,
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const full = !single && value.length >= max;

  const query = fold(text.trim());
  const typed = normalize(text.trim());
  // Önce yazılanla başlayanlar, sonra içinde geçenler. Arama Türkçe karakterlere duyarsızdır.
  const matches = options
    .filter((o) => (single || !value.includes(o.value)) && (!query || fold(o.label).includes(query)))
    .sort((a, b) => Number(!fold(a.label).startsWith(query)) - Number(!fold(b.label).startsWith(query)));
  // "Ekle" yalnızca yazılan, bir seçeneğin adıyla ya da seçili bir etiketle birebir aynı değilse çıkar.
  // (Seçeneklerin iç kodlarıyla karşılaştırılmaz: "reklam" yazmak "Reklam" eklemeyi engellememeli.)
  const exists = (label: string) => fold(label) === fold(typed);
  const canAdd =
    allowCustom && !full && typed.length >= 2 && !options.some((o) => exists(o.label)) && !value.some((v) => exists(labelOf(v)));

  const items: Item[] = [
    ...matches.map((option) => ({ kind: "option" as const, option })),
    ...(canAdd ? [{ kind: "custom" as const, text: typed }] : []),
  ];
  // Yazarken ilk öneri otomatik vurgulanır: Enter onu seçer. Ok tuşları ya da fare vurguyu değiştirir.
  const current = active >= 0 ? Math.min(active, items.length - 1) : query && items.length > 0 ? 0 : -1;

  function pick(item: Item) {
    const v = item.kind === "option" ? item.option.value : item.text;
    if (single) onChange([v]);
    else if (!value.includes(v) && !full) onChange([...value, v]);
    // Liste her seçimde kapanır; böylece altındaki alanlara tıklarken yanlışlıkla bir öneriye basılmaz.
    // Alana tıklamak, yazmak ya da ok tuşuna basmak listeyi yeniden açar.
    setOpen(false);
    setText("");
    setActive(-1);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive(Math.min(items.length - 1, current + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(0, current - 1));
    } else if (e.key === "Enter") {
      // Enter formu göndermez; vurgulu öneriyi seçer. Kendi ifadeni eklemek için listedeki "ekle" satırını seç.
      if (open && current >= 0) {
        e.preventDefault();
        pick(items[current]);
      } else if (text.trim()) {
        e.preventDefault();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (e.key === "Backspace" && !text && !single && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  const listId = `${id}-list`;
  const empty: ReactNode =
    items.length === 0 ? (
      <p className="px-3 py-2.5 text-sm text-muted">
        {full ? "En fazla sayıya ulaştınız." : allowCustom ? "Eşleşen öneri yok. Yazıp ekleyebilirsiniz." : "Eşleşen seçenek yok."}
      </p>
    ) : null;

  return (
    <div
      className="grid gap-2"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
          setActive(-1);
        }
      }}
    >
      <label htmlFor={`${id}-input`} className="text-base font-medium">
        {legend}
        {hint && <span className="mt-0.5 block text-sm font-normal text-muted">{hint}</span>}
      </label>

      {/* Liste, alanın altında yüzen bir katmandır: kapanınca sayfa kaymaz, "Devam" tıklaması kaçmaz. */}
      <div className="relative">
      <div
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
        data-invalid={error ? "" : undefined}
        aria-disabled={disabled || undefined}
        className={`relative flex min-h-13 cursor-text flex-wrap items-center gap-2 rounded-row bg-surface py-2 pr-11 pl-3 ring-1 ring-line-strong transition-shadow ring-inset focus-within:ring-2 focus-within:ring-forest data-[invalid]:ring-danger ${disabled ? "pointer-events-none opacity-55" : ""}`}
      >
        {value.map((v) => (
          <span key={v} className={`${styles.pop} inline-flex items-center gap-0.5 rounded-full bg-forest py-1 pr-1 pl-3.5 text-sm text-white`}>
            {labelOf(v)}
            <button
              type="button"
              aria-label={`${labelOf(v)} seçimini kaldır`}
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((x) => x !== v));
                inputRef.current?.focus();
              }}
              className="grid size-6 place-items-center rounded-full transition-colors hover:bg-white/20"
            >
              <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                <path d="m2.5 2.5 7 7m0-7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={`${id}-input`}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && current >= 0 ? `${id}-opt-${current}` : undefined}
          aria-invalid={error ? true : undefined}
          value={text}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={value.length === 0 ? placeholder : undefined}
          maxLength={40}
          autoComplete="off"
          className="min-w-16 flex-1 bg-transparent py-1 outline-none placeholder:text-muted"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? "Önerileri kapat" : "Önerileri aç"}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className="absolute top-2.5 right-2 grid size-8 place-items-center rounded-full text-muted hover:bg-sunken"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
            <path d="m3.5 6 4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && !disabled && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 rounded-row bg-surface p-1.5 shadow-float ring-1 ring-line-strong">
          {empty}
          {items.length > 0 && (
            <ul id={listId} role="listbox" aria-label={legend} aria-multiselectable={!single} className="max-h-64 overflow-auto">
              {items.map((item, i) => {
                const selected = item.kind === "option" && single && value.includes(item.option.value);
                return (
                  <li
                    key={item.kind === "option" ? item.option.value : "custom"}
                    id={`${id}-opt-${i}`}
                    role="option"
                    aria-selected={selected}
                    data-active={i === current}
                    onPointerDown={(e) => e.preventDefault()} // girdi odağını kaybetmesin
                    onClick={() => pick(item)}
                    onMouseMove={() => setActive(i)}
                    className="flex cursor-pointer items-start justify-between gap-3 rounded-control px-3 py-2.5 data-[active=true]:bg-sunken"
                  >
                    {item.kind === "option" ? (
                      <span className="grid gap-0.5">
                        <span className="leading-snug">{item.option.label}</span>
                        {item.option.hint && <span className="text-sm leading-snug text-muted">{item.option.hint}</span>}
                      </span>
                    ) : (
                      <span className="font-medium text-forest">&ldquo;{item.text}&rdquo; ekle</span>
                    )}
                    {selected && (
                      <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true" className="mt-1 shrink-0 text-forest">
                        <path d="m2.5 6.2 2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
