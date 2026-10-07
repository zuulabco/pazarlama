import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { searchLimits } from "@/modules/leads/config";
import {
  getSearch,
  isActive,
  leadSorts,
  listSearches,
  queryLeads,
  type LeadSort,
  type Search,
} from "@/modules/leads/repository";
import { getProfile } from "@/modules/profile/repository";
import { LeadList } from "./_components/lead-list";
import { SearchForm } from "./_components/search-form";
import { SearchProgress } from "./_components/search-progress";

export const metadata: Metadata = { title: "Müşteri bul" };

const BASE = "/panel/musteri-bul";
const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

type Filters = { s: string; min?: 50 | 70; dn?: 80; sort: LeadSort };

function href(f: Filters) {
  const params = new URLSearchParams({ s: f.s });
  if (f.min) params.set("min", String(f.min));
  if (f.dn) params.set("dn", String(f.dn));
  if (f.sort !== "score") params.set("sort", f.sort);
  return `${BASE}?${params}`;
}

function describe(f: Filters, total: number) {
  const parts: string[] = [];
  if (f.min) parts.push(`genel skoru ${f.min}+`);
  if (f.dn) parts.push(`dijital ihtiyaç skoru ${f.dn}+`);
  return parts.length
    ? `Hedef profilinize uygun ve ${parts.join(", ")} olan ${total} firma bulundu`
    : `Hedef profilinize göre puanlanmış ${total} firma`;
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex h-9 items-center rounded-full px-4 text-sm ring-1 transition-colors ring-inset ${
        active ? "bg-forest text-white ring-forest" : "bg-surface ring-line-strong hover:bg-sunken"
      }`}
    >
      {children}
    </Link>
  );
}

const statusLabel: Record<Search["status"], string> = {
  pending: "Başlıyor",
  scraping: "Toplanıyor",
  scoring: "Puanlanıyor",
  done: "Tamamlandı",
  failed: "Başarısız",
};

async function Content({ searchParams }: { searchParams: PageProps<"/panel/musteri-bul">["searchParams"] }) {
  const user = await requireUser();
  const profile = await getProfile(user.uid);
  if (!profile) redirect("/onboarding");

  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  const searches = await listSearches(user.uid);
  const requested = one(sp.s);
  const selected =
    requested && z.uuid().safeParse(requested).success
      ? (searches.find((x) => x.id === requested) ?? (await getSearch(user.uid, requested)))
      : searches[0];

  const sortParam = one(sp.sort);
  const filters: Filters | null = selected && {
    s: selected.id,
    min: one(sp.min) === "70" ? 70 : one(sp.min) === "50" ? 50 : undefined,
    dn: one(sp.dn) === "80" ? 80 : undefined,
    sort: sortParam && sortParam in leadSorts ? (sortParam as LeadSort) : "score",
  };

  const results =
    selected?.status === "done" && filters
      ? await queryLeads(user.uid, selected.id, { minScore: filters.min, minDigital: filters.dn, sort: filters.sort, limit: 100 })
      : null;

  return (
    <div className="grid gap-10">
      <SearchForm
        defaultLocation={profile.cityScope === "cities" ? (profile.targetCities[0] ?? "") : ""}
        resultOptions={searchLimits.resultOptions}
        defaultResults={searchLimits.defaultResults}
      />

      {selected && filters && (
        <section aria-labelledby="results-title" className="grid gap-5">
          <div>
            <h2 id="results-title" className="text-lg font-semibold tracking-tight">
              {selected.query} · {selected.location}
            </h2>
            <p className="text-sm text-muted">{dateFormat.format(new Date(selected.created_at))}</p>
          </div>

          {isActive(selected.status) && (
            <SearchProgress
              key={selected.id}
              id={selected.id}
              initial={{ status: selected.status, found: selected.total_found, scored: selected.total_scored, error: selected.error }}
            />
          )}

          {selected.status === "failed" && (
            <p role="alert" className="rounded-panel bg-danger-soft px-5 py-4 text-danger">
              {selected.error ?? "Arama tamamlanamadı."} Yeni bir arama başlatabilirsiniz.
            </p>
          )}

          {results && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Chip href={href({ ...filters, min: undefined, dn: undefined })} active={!filters.min && !filters.dn}>
                  Tümü
                </Chip>
                <Chip href={href({ ...filters, min: 70, dn: undefined })} active={filters.min === 70 && !filters.dn}>
                  Skor 70+
                </Chip>
                <Chip href={href({ ...filters, min: undefined, dn: 80 })} active={filters.dn === 80 && !filters.min}>
                  Dijital ihtiyaç 80+
                </Chip>
                <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
                {(Object.keys(leadSorts) as LeadSort[]).map((k) => (
                  <Chip key={k} href={href({ ...filters, sort: k })} active={filters.sort === k}>
                    {leadSorts[k].label}
                  </Chip>
                ))}
              </div>

              <p className="text-sm text-muted" aria-live="polite">
                {describe(filters, results.total)}.
                {selected.error && ` ${selected.error}`}
              </p>

              {results.rows.length > 0 ? (
                <LeadList rows={results.rows} />
              ) : (
                <p className="rounded-panel bg-surface px-5 py-8 text-center text-muted ring-1 ring-line">
                  {filters.min || filters.dn
                    ? "Bu filtreye uyan firma yok. Filtreyi kaldırıp tüm listeye bakabilirsiniz."
                    : "Bu aramada firma bulunamadı. Daha geniş bir bölge ya da farklı bir ifade deneyin."}
                </p>
              )}
            </>
          )}
        </section>
      )}

      {searches.length > 1 && (
        <section aria-labelledby="history-title">
          <h2 id="history-title" className="text-sm font-medium text-muted">
            Önceki aramalar
          </h2>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-panel bg-surface ring-1 ring-line">
            {searches.map((x) => (
              <li key={x.id}>
                <Link
                  href={`${BASE}?s=${x.id}`}
                  aria-current={selected?.id === x.id ? "true" : undefined}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-sunken/50 aria-[current=true]:bg-forest-soft"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {x.query} · {x.location}
                    </span>
                    <span className="text-sm text-muted">{dateFormat.format(new Date(x.created_at))}</span>
                  </span>
                  <span className="shrink-0 text-sm text-muted">
                    {statusLabel[x.status]}
                    {x.status === "done" ? ` · ${x.total_scored} firma` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function LeadsPage(props: PageProps<"/panel/musteri-bul">) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Müşteri bul</h1>
      <p className="mt-2 mb-8 max-w-prose text-muted">
        Aradığınız firma türünü ve bölgeyi yazın. Firmaları toplayıp hedef profilinize göre puanlayalım.
      </p>
      <Suspense fallback={<div className="h-72 rounded-panel bg-sunken" aria-hidden="true" />}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
