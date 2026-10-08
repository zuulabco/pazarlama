"use client";

import { useId } from "react";
import { RotatingTips } from "@/components/ui/rotating-tips";
import styles from "./wizard.module.css";

/** Analiz sürerken dönen ifadeler (sabit "yükleniyor" yerine). */
export const analysisTips = [
  "Siteniz açılıyor…",
  "Ne yaptığınızı okuyoruz…",
  "Hizmetleriniz çıkarılıyor…",
  "Hizmet verdiğiniz bölge aranıyor…",
  "Bilgi kartınız hazırlanıyor…",
];

/** Web sitesi girişi. Analiz sürerken çerçeve yumuşak bir renk geçişiyle akar. */
export function SiteField({
  value,
  onChange,
  onBlur,
  busy,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  busy: boolean;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="grid gap-2 text-left">
      <label htmlFor={id} className="text-base font-medium">
        Site adresi
      </label>
      <div className={styles.siteFrame} data-busy={busy} data-invalid={error ? "" : undefined}>
        <input
          id={id}
          type="text"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="firmaniz.com"
          value={value}
          readOnly={busy}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          maxLength={200}
          className="h-14 w-full rounded-[calc(var(--radius-row)-2px)] bg-surface px-4 text-lg outline-none placeholder:text-muted"
        />
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {busy && (
        <div className="mt-2 justify-self-center" role="status">
          <RotatingTips tips={analysisTips} label={null} />
        </div>
      )}
    </div>
  );
}
