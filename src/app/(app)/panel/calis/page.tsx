import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { FavoritesUnavailableError, listFavorites, type FavoriteWithNotes } from "@/modules/favorites/repository";
import { getProfile } from "@/modules/profile/repository";
import { serviceLabel, suggestService } from "@/modules/work/context";
import { loadWorkFirm } from "@/modules/work/load";
import { customerTabs, SectionTabs } from "../../_components/section-tabs";
import { PageSkeleton } from "../../_components/skeletons";
import { WorkWorkspace } from "./_components/work-workspace";

export const metadata: Metadata = { title: "İletişim kur" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

async function Content({ searchParams }: { searchParams: PageProps<"/panel/calis">["searchParams"] }) {
  const user = await requireUser();
  const profile = await getProfile(user.uid);
  if (!profile) redirect("/onboarding");

  let favorites: FavoriteWithNotes[] = [];
  try {
    favorites = await listFavorites(user.uid);
  } catch (e) {
    if (!(e instanceof FavoritesUnavailableError)) throw e;
    return (
      <p role="status" className="rounded-panel bg-surface px-6 py-10 text-center text-muted ring-1 ring-line">
        Takip listesi henüz etkinleştirilmedi. Kısa süre sonra tekrar deneyin.
      </p>
    );
  }

  const sp = await searchParams;
  const firmaId = one(sp.firma);
  const firm = firmaId && z.uuid().safeParse(firmaId).success ? await loadWorkFirm(user.uid, firmaId) : null;

  return (
    <WorkWorkspace
      favorites={favorites.map((f) => ({ id: f.id, name: f.name, district: f.city, category: f.category }))}
      firm={firm}
      tool={one(sp.arac) === "email" ? "email" : "message"}
      services={profile.services.map((value) => ({ value, label: serviceLabel(value) }))}
      suggestedService={firm ? suggestService(profile.services, firm.hasWebsite) : null}
    />
  );
}

export default function WorkPage(props: PageProps<"/panel/calis">) {
  return (
    <>
      <SectionTabs title="Müşteri" tabs={customerTabs} />
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
