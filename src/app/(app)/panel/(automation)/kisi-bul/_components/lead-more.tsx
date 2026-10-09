"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";

const num = (n: number) => new Intl.NumberFormat("tr-TR").format(n);
const quick = [10, 25, 50, 100] as const;
const MAX = 200;

/**
 * "Daha fazla listele": liste hazır olduktan sonra aynı aramaya (zaten listelenenler hariç) daha fazla kişi ekler.
 * Sayı hazır seçeneklerden seçilir ya da elle yazılır; kalan listeleme hakkını aşan seçenek çıkmaz, aşan sayı yazılınca uyarılır.
 */
export function LeadMore({ left, unlimited = false, busy, onMore }: { left: number; unlimited?: boolean; busy: boolean; onMore: (count: number) => void }) {
  const [custom, setCustom] = useState("");
  const max = Math.min(left, MAX);
  const n = Number(custom);
  const error = !custom ? undefined : n < 5 ? "En az 5 kişi." : n > max ? `En çok ${num(max)} kişi listeleyebilirsiniz.` : undefined;
  const options = quick.filter((c) => c <= left);

  if (left < 5) {
    return <p className="rounded-row bg-sunken/60 px-4 py-3 text-sm text-muted">Listeleme hakkınız doldu; daha fazla kişi listelemek için yeni gün ya da ay başını bekleyin.</p>;
  }

  return (
    <section aria-label="Daha fazla listele" className="grid gap-3 rounded-row bg-sunken/60 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">Daha fazla listele</h3>
        <p className="text-sm text-muted">
          Kalan listeleme hakkınız: <span className="font-medium tabular-nums text-ink">{unlimited ? "Sınırsız" : `${num(left)} kişi`}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {options.map((c) => (
          <button key={c} type="button" disabled={busy} onClick={() => onMore(c)} className="h-9 rounded-full px-4 text-sm font-medium ring-1 ring-line-strong ring-inset transition-colors hover:bg-forest-soft/60 hover:ring-forest/50 disabled:opacity-50">
            +{c}
          </button>
        ))}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (custom && !error) onMore(n);
          }}
        >
          <label className="sr-only" htmlFor="more-custom">
            Özel kişi sayısı
          </label>
          <input
            id="more-custom"
            inputMode="numeric"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 3))}
            placeholder="Özel sayı"
            aria-invalid={error ? true : undefined}
            className="h-9 w-28 rounded-full bg-surface px-4 text-sm ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest aria-invalid:ring-danger"
          />
          <Button type="submit" variant="secondary" disabled={busy || !custom || Boolean(error)} className="h-9">
            <PlusIcon size={14} />
            Listele
          </Button>
        </form>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
