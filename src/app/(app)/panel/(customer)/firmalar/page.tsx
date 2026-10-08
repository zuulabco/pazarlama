import { ListSkeleton } from "../../../_components/skeletons";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { FavoritesUnavailableError, listFavorites, type FavoriteWithNotes } from "@/modules/favorites/repository";
import { getProfile } from "@/modules/profile/repository";
import { SavedFirms } from "./_components/saved-firms";

export const metadata: Metadata = { title: "Kayıtlı firmalar" };

async function Content() {
  const user = await requireUser();
  if (!(await getProfile(user.uid))) redirect("/onboarding");

  let favorites: FavoriteWithNotes[] = [];
  try {
    favorites = await listFavorites(user.uid);
  } catch (e) {
    if (!(e instanceof FavoritesUnavailableError)) throw e;
    return (
      <p role="status" className="rounded-panel bg-surface px-6 py-10 text-center text-muted ring-1 ring-line">
        Kayıtlı firmalar henüz etkinleştirilmedi. Kısa süre sonra tekrar deneyin.
      </p>
    );
  }
  return <SavedFirms favorites={favorites} />;
}

export default function FavoritesPage() {
  return (
    <>
      <Suspense fallback={<ListSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}
