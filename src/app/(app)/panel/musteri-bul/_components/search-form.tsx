"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function SearchForm({
  defaultLocation,
  resultOptions,
  defaultResults,
}: {
  defaultLocation: string;
  resultOptions: readonly number[];
  defaultResults: number;
}) {
  const router = useRouter();
  const [maxResults, setMaxResults] = useState(defaultResults);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: String(form.get("query") ?? ""),
          location: String(form.get("location") ?? ""),
          maxResults,
        }),
      });
      const body = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!res.ok || !body?.id) {
        setError(body?.error ?? "Arama başlatılamadı. Tekrar deneyin.");
        setPending(false);
        return;
      }
      router.push(`/panel/musteri-bul?s=${body.id}`);
      router.refresh();
      setPending(false);
    } catch {
      setError("Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 rounded-panel bg-surface p-6 ring-1 ring-line sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Hangi tür firmalar?"
          name="query"
          placeholder="Örn. diş kliniği, kafe, emlak ofisi"
          required
          minLength={2}
          maxLength={80}
        />
        <Field
          label="Nerede?"
          name="location"
          defaultValue={defaultLocation}
          placeholder="Örn. Kadıköy, İstanbul"
          required
          minLength={2}
          maxLength={60}
        />
      </div>

      <fieldset className="grid gap-2.5">
        <legend className="text-sm font-medium">Kaç firma getirilsin?</legend>
        <div className="flex flex-wrap gap-2">
          {resultOptions.map((n) => (
            <label key={n} className="relative cursor-pointer">
              <input
                type="radio"
                name="maxResults"
                className="peer sr-only"
                checked={maxResults === n}
                onChange={() => setMaxResults(n)}
              />
              <span
                data-checked={maxResults === n}
                className="inline-flex h-10 min-w-14 items-center justify-center rounded-full px-4 text-sm ring-1 transition-colors ring-inset select-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest data-[checked=false]:bg-surface data-[checked=false]:ring-line-strong data-[checked=false]:hover:bg-sunken data-[checked=true]:bg-forest data-[checked=true]:text-white data-[checked=true]:ring-forest"
              >
                {n}
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted">Daha az firma, daha hızlı sonuç demektir.</p>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Arama başlatılıyor…" : "Firmaları bul"}
        </Button>
      </div>
    </form>
  );
}
