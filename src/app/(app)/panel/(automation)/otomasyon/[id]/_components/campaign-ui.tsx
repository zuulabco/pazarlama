"use client";

import type { ReactNode } from "react";

/** Otomasyon ekranlarının ortak küçük parçaları. */

export const inputClass =
  "h-11 w-full min-w-0 rounded-control bg-surface px-3.5 ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest aria-invalid:ring-danger";

export const textareaClass =
  "w-full min-w-0 resize-y rounded-row bg-surface px-3.5 py-3 leading-relaxed ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest aria-invalid:ring-danger";

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-medium">
      {label}
      {hint && <span className="-mt-1 text-sm font-normal text-muted">{hint}</span>}
      {children}
      {error && (
        <span role="alert" className="text-sm font-normal text-danger">
          {error}
        </span>
      )}
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-3 text-sm ${disabled ? "opacity-60" : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--color-forest)]" />
      <span className="grid gap-0.5">
        <span className="font-medium">{label}</span>
        {hint && <span className="text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** Ayarlar sekmesindeki bölüm kartı: başlık, tek cümlelik açıklama ve içerik. */
export function SettingsCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid min-w-0 gap-5 rounded-panel bg-surface p-5 ring-1 ring-line sm:p-6">
      <div className="grid gap-1">
        <h3 className="font-semibold tracking-tight">{title}</h3>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export const fmtDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "—";

export const pct = (n: number) => `%${n.toFixed(1).replace(".", ",").replace(/,0$/, "")}`;

/** Metin alanında imlecin olduğu yere `text` ekler; imleç eklenen metnin sonuna taşınır. */
export function insertAtCursor(el: HTMLTextAreaElement | HTMLInputElement | null, value: string, text: string, apply: (next: string) => void) {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  apply(value.slice(0, start) + text + value.slice(end));
  requestAnimationFrame(() => {
    el?.focus();
    el?.setSelectionRange(start + text.length, start + text.length);
  });
}
