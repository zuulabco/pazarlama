import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { canonicalProvince } from "@/modules/leads/location";
import { computeFacets, filterAndSort } from "@/modules/leads/facets";
import {
  getSearch,
  leadSorts,
  listScoredLeads,
  listSearches,
  type LeadSort,
  type Presence,
  type Search,
} from "@/modules/leads/repository";
import { favoritePlaceIds } from "@/modules/favorites/repository";
import { getProfile } from "@/modules/profile/repository";
import { LeadList } from "./_components/lead-list";
import { LeadsWorkspace } from "./_components/leads-workspace";
import type { ResultFilters, SearchView } from "./_components/types";

export const metadata: Metadata = { title: "Müşteri bul" };

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const pick = <T extends number>(v: string | undefined, allowed: readonly T[]) => allowed.find((a) => String(a) === v);
const presence = (v: string | undefined): Presence | undefined => (v === "var" || v === "yok" ? v : undefined);

/** Adres çubuğundaki süzgeç parametrelerini okur; yalnızca bilinen değerler kabul edilir. */
function parseFilters(sp: Params): ResultFilters {
  const sort = one(sp.sort);
  return {
    min: pick(one(sp.min), [50, 70, 85] as const),
    dn: pick(one(sp.dn), [60, 80] as const),
    web: presence(one(sp.web)),
    tel: presence(one(sp.tel)),
    star: pick(one(sp.star), [4, 4.5] as const),
    rev: pick(one(sp.rev), [50, 200, 500] as const),
    rc: pick(one(sp.rc), [60, 80] as const),
    d: one(sp.d)?.slice(0, 60) || undefined,
    sort: sort && sort in leadSorts ? (sort as LeadSort) : "score",
  };
}

const toView = (s: Search): SearchView => ({
  id: s.id,
  query: s.query,
  location: s.location,
  status: s.status,
  found: s.total_found,
  scored: s.total_scored,
  max: s.max_results,
  error: s.error,
  createdAt: s.created_at,
});

async function Content({ searchParams }: { searchParams: PageProps<"/panel/musteri-bul">["searchParams"] }) {
  const user = await requireUser();
  const profile = await getProfile(user.uid);
  if (!profile) redirect("/onboarding");

  const sp = await searchParams;
  const filters = parseFilters(sp);

  const searches = await listSearches(user.uid);
  // Sayfa açıldığında hiçbir arama seçili gelmez; geçmiş aramaya "Son aramalar" üzerinden ya da ?s= ile ulaşılır.
  const requested = one(sp.s);
  const selected =
    requested && z.uuid().safeParse(requested).success
      ? (searches.find((x) => x.id === requested) ?? (await getSearch(user.uid, requested)))
      : null;

  // Arama sürerken de o ana kadar puanlanan firmalar listelenir (sonuçlar geldikçe belirir).
  // Bir arama en çok 100 firma içerdiği için süzme, sıralama ve süzgeç sayıları tek sorguyla bellekte yapılır.
  const allLeads = selected ? await listScoredLeads(user.uid, selected.id) : [];
  const rows = filterAndSort(allLeads, filters, filters.sort);
  const facets = computeFacets(allLeads, filters);
  const total = allLeads.length;

  const favorites = await favoritePlaceIds(user.uid, rows.map((r) => r.place_id));
  const filtered = Object.entries(filters).some(([k, v]) => k !== "sort" && v !== undefined);
  const firstCity = profile.cityScope === "cities" ? profile.targetCities.map(canonicalProvince).find(Boolean) : null;

  return (
    <LeadsWorkspace
      search={selected ? toView(selected) : null}
      searches={searches.map(toView)}
      filters={filters}
      total={total}
      shown={rows.length}
      facets={facets}
      defaults={{ province: firstCity ?? "", district: "" }}
    >
      {rows.length > 0 ? (
        <LeadList rows={rows} favorites={favorites} />
      ) : (
        selected && (
          <p className="px-5 py-10 text-center text-muted">
            {filtered
              ? "Bu süzgeçlere uyan firma yok. Bir süzgeci kaldırın ya da gevşetin."
              : selected?.status === "done"
                ? "Bu aramada firma bulunamadı. Daha geniş bir bölge ya da farklı bir firma türü deneyin."
                : null}
          </p>
        )
      )}
    </LeadsWorkspace>
  );
}

export default function LeadsPage(props: PageProps<"/panel/musteri-bul">) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Müşteri bul</h1>
      <p className="mt-2 mb-8 max-w-prose text-muted">
        Firma türünü ve bölgeyi seçin; firmaları bulup hedef profilinize göre puanlayalım.
      </p>
      <Suspense fallback={<div className="h-96 rounded-panel bg-sunken" aria-hidden="true" />}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
