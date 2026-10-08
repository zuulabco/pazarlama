"use client";

/** Açma/kapama anahtarı (role="switch"): etiket ve isteğe bağlı açıklama solda, anahtar sağda. */
export function Switch({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={`flex items-start justify-between gap-4 text-sm ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
      <span className="grid gap-0.5">
        <span className="font-medium">{label}</span>
        {hint && <span className="text-muted">{hint}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center">
        <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span aria-hidden="true" className="absolute inset-0 rounded-full bg-line-strong transition-colors peer-checked:bg-forest peer-focus-visible:ring-2 peer-focus-visible:ring-forest peer-focus-visible:ring-offset-2" />
        <span aria-hidden="true" className="absolute left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}
