"use client";

import { useState } from "react";
import { Disclosure } from "@/components/ui/disclosure";
import { scoreTone } from "@/lib/score";
import { safeUrl, telHref } from "@/lib/url";
import type { LeadRow as Lead } from "@/modules/leads/repository";

const criteria: { key: keyof Lead; label: string }[] = [
  { key: "sector_fit", label: "Sektör uyumu" },
  { key: "company_size", label: "İşletme büyüklüğü" },
  { key: "audience_fit", label: "Hedef kitle uyumu" },
  { key: "digital_need", label: "Dijital ihtiyaç" },
  { key: "purchase_potential", label: "Satın alma potansiyeli" },
  { key: "reachability", label: "Ulaşılabilirlik" },
  { key: "priority", label: "Öncelik" },
];

const linkClass = "rounded-control px-3 py-1.5 text-sm font-medium ring-1 ring-line-strong ring-inset hover:bg-sunken";

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className="transition-transform duration-200 group-active:scale-90">
      <path
        d="m12 3.6 2.55 5.2 5.7.83-4.13 4.03.98 5.69L12 16.66 6.9 19.35l.98-5.69L3.75 9.63l5.7-.83L12 3.6Z"
        fill={filled ? "var(--color-pollen)" : "none"}
        stroke={filled ? "var(--color-forest)" : "currentColor"}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Bir firma satırı: yıldızla takibe alma + yumuşakça açılan detay paneli. */
export function LeadRow({ lead, favorited }: { lead: Lead; favorited: boolean }) {
  const [fav, setFav] = useState(favorited);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const website = safeUrl(lead.website);
  const maps = safeUrl(lead.maps_url);
  const tel = telHref(lead.phone);
  const score = lead.lead_score ?? 0;

  async function toggle() {
    if (busy) return;
    const next = !fav;
    setFav(next); // anında yansır; başarısız olursa geri alınır
    setBusy(true);
    setError(null);
    try {
      const res = next
        ? await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leadId: lead.id }),
          })
        : await fetch(`/api/favorites?placeId=${encodeURIComponent(lead.place_id)}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "İşlem tamamlanamadı. Tekrar deneyin.");
      }
    } catch (e) {
      setFav(!next);
      setError(e instanceof Error ? e.message : "İşlem tamamlanamadı. Tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li>
      <Disclosure
        leading={
          <button
            type="button"
            onClick={toggle}
            aria-pressed={fav}
            aria-label={fav ? `${lead.name} firmasını takipten çıkar` : `${lead.name} firmasını takibe al`}
            title={fav ? "Takipten çıkar" : "Takibe al"}
            className="group ml-3 grid size-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-forest aria-pressed:text-forest"
          >
            <StarIcon filled={fav} />
          </button>
        }
        buttonClassName="py-4 pr-5 pl-3 hover:bg-sunken/40"
        panelClassName="grid gap-6 border-t border-line bg-paper/60 px-5 py-5 md:grid-cols-2"
        summary={
          <span className="grid min-w-0 flex-1 grid-cols-[1fr_auto] items-center gap-4 sm:grid-cols-[1fr_8rem_auto]">
            <span className="min-w-0">
              <span className="block truncate font-medium">{lead.name}</span>
              <span className="block truncate text-sm text-muted">
                {[lead.category, lead.city].filter(Boolean).join(" · ")}
                {lead.rating ? ` · ${String(lead.rating).replace(".", ",")} puan` : ""}
                {lead.review_count ? ` (${lead.review_count} yorum)` : ""}
              </span>
              {(!lead.website || !lead.phone) && (
                <span className="mt-1 flex flex-wrap gap-1.5 text-xs">
                  {!lead.website && <span className="rounded-full bg-pollen px-2 py-0.5 font-medium">Web sitesi yok</span>}
                  {!lead.phone && <span className="rounded-full bg-sunken px-2 py-0.5">Telefon yok</span>}
                </span>
              )}
            </span>
            <span className="hidden h-1.5 overflow-hidden rounded-full bg-sunken sm:block" aria-hidden="true">
              <span className={`block h-full rounded-full ${scoreTone(score)}`} style={{ width: `${score}%` }} />
            </span>
            <span className="w-10 text-right text-2xl font-semibold tracking-tight tabular-nums">
              {score}
              <span className="sr-only"> genel skor</span>
            </span>
          </span>
        }
      >
        <dl className="grid gap-2.5">
          {criteria.map((c) => {
            const value = (lead[c.key] as number | null) ?? 0;
            return (
              <div key={c.key} className="grid grid-cols-[minmax(0,10.5rem)_1fr_2rem] items-center gap-3 text-sm">
                <dt className="truncate text-muted">{c.label}</dt>
                <div className="h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
                  <div className={`h-full rounded-full ${scoreTone(value)}`} style={{ width: `${value}%` }} />
                </div>
                <dd className="text-right font-medium tabular-nums">{value}</dd>
              </div>
            );
          })}
        </dl>
        <div className="grid content-start gap-3 text-sm">
          {lead.address && <p className="text-muted">{lead.address}</p>}
          <div className="flex flex-wrap gap-2">
            {tel && (
              <a href={tel} className={linkClass}>
                {lead.phone}
              </a>
            )}
            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer" className={linkClass}>
                Web sitesi
              </a>
            )}
            {maps && (
              <a href={maps} target="_blank" rel="noopener noreferrer" className={linkClass}>
                Haritada aç
              </a>
            )}
          </div>
        </div>
      </Disclosure>
      {error && (
        <p role="alert" className="px-5 pb-3 text-sm text-danger">
          {error}
        </p>
      )}
    </li>
  );
}
