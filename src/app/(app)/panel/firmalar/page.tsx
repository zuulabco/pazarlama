import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { FavoritesUnavailableError, listFavorites, type Favorite } from "@/modules/favorites/repository";
import { getProfile } from "@/modules/profile/repository";
import { customerTabs, SectionTabs } from "../../_components/section-tabs";
import { FavoritesBoard } from "./_components/favorites-board";

export const metadata: Metadata = { title: "Takip" };

async function Content() {
  const user = await requireUser();
  if (!(await getProfile(user.uid))) redirect("/onboarding");

  let favorites: Favorite[] = [];
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
  return <FavoritesBoard favorites={favorites} />;
}

export default function FavoritesPage() {
  return (
    <>
      <SectionTabs title="Müşteri" tabs={customerTabs} />
      <Suspense fallback={<div className="h-72 rounded-panel bg-sunken" aria-hidden="true" />}>
        <Content />
      </Suspense>
    </>
  );
}
