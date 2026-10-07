import { scoreTone } from "@/lib/score";
import { safeUrl, telHref } from "@/lib/url";
import type { LeadRow } from "@/modules/leads/repository";

const criteria: { key: keyof LeadRow; label: string }[] = [
  { key: "sector_fit", label: "Sektör uyumu" },
  { key: "company_size", label: "İşletme büyüklüğü" },
  { key: "audience_fit", label: "Hedef kitle uyumu" },
  { key: "digital_need", label: "Dijital ihtiyaç" },
  { key: "purchase_potential", label: "Satın alma potansiyeli" },
  { key: "reachability", label: "Ulaşılabilirlik" },
  { key: "priority", label: "Öncelik" },
];

const linkClass = "rounded-control px-3 py-1.5 text-sm font-medium ring-1 ring-line-strong ring-inset hover:bg-sunken";

export function LeadList({ rows }: { rows: LeadRow[] }) {
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-panel bg-surface ring-1 ring-line">
      {rows.map((lead) => {
        const website = safeUrl(lead.website);
        const maps = safeUrl(lead.maps_url);
        const tel = telHref(lead.phone);
        const score = lead.lead_score ?? 0;

        return (
          <li key={lead.id}>
            <details className="group">
              <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 hover:bg-sunken/50 sm:grid-cols-[1fr_8rem_auto] [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <p className="truncate font-medium">{lead.name}</p>
                  <p className="truncate text-sm text-muted">
                    {[lead.category, lead.city].filter(Boolean).join(" · ")}
                    {lead.rating ? ` · ${String(lead.rating).replace(".", ",")} puan` : ""}
                    {lead.review_count ? ` (${lead.review_count} yorum)` : ""}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    {!lead.website && <span className="rounded-full bg-pollen px-2 py-0.5 font-medium">Web sitesi yok</span>}
                    {!lead.phone && <span className="rounded-full bg-sunken px-2 py-0.5">Telefon yok</span>}
                  </p>
                </div>
                <div className="hidden h-1.5 overflow-hidden rounded-full bg-sunken sm:block" aria-hidden="true">
                  <div className={`h-full rounded-full ${scoreTone(score)}`} style={{ width: `${score}%` }} />
                </div>
                <div className="flex items-center gap-3">
                  <p className="w-10 text-right text-2xl font-semibold tracking-tight tabular-nums">
                    {score}
                    <span className="sr-only"> genel skor</span>
                  </p>
                  <svg
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    aria-hidden="true"
                    className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
                  >
                    <path d="m3.5 6 4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </summary>

              <div className="grid gap-6 border-t border-line bg-paper/60 px-5 py-5 md:grid-cols-2">
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
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}
