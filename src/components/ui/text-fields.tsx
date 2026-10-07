"use client";

import { useId, type ComponentProps } from "react";

/** Büyük, tek satırlık metin alanı (onboarding ve profil formları). */
export function BigInput({
  label,
  error,
  ...props
}: { label: string; error?: string } & Omit<ComponentProps<"input">, "className">) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-base font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-14 rounded-row bg-surface px-4 text-lg ring-1 ring-line-strong ring-inset transition-shadow outline-none placeholder:text-muted focus:ring-2 focus:ring-forest aria-invalid:ring-danger"
        {...props}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Karakter sayaçlı çok satırlı metin alanı. */
export function TextArea({
  label,
  hint,
  error,
  ...props
}: { label: string; hint?: string; error?: string } & Omit<ComponentProps<"textarea">, "className">) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-base font-medium">
        {label}
        {hint && <span className="mt-0.5 block text-sm font-normal text-muted">{hint}</span>}
      </label>
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="resize-y rounded-row bg-surface px-4 py-3 leading-relaxed ring-1 ring-line-strong ring-inset transition-shadow outline-none placeholder:text-muted focus:ring-2 focus:ring-forest aria-invalid:ring-danger"
        {...props}
      />
      <div className="flex justify-between gap-4 text-sm">
        <p id={`${id}-error`} role={error ? "alert" : undefined} className="text-danger">
          {error}
        </p>
        <p className="shrink-0 text-muted tabular-nums">
          {String(props.value ?? "").length} / {props.maxLength}
        </p>
      </div>
    </div>
  );
}
