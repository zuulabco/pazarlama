import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { listContactPicks, OutreachUnavailableError, type ContactPick } from "@/modules/outreach/contacts";
import { FavoritesUnavailableError, listFavorites, type FavoriteWithNotes } from "@/modules/favorites/repository";
import { getProfile } from "@/modules/profile/repository";
import { serviceLabel, suggestService } from "@/modules/work/context";
import { loadWorkFirm } from "@/modules/work/load";
import { ComposerSkeleton } from "../../../_components/skeletons";
import { WorkWorkspace } from "./_components/work-workspace";

export const metadata: Metadata = { title: "Mesaj hazırla" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

async function Content({ searchParams }: { searchParams: PageProps<"/panel/calis">["searchParams"] }) {
  const user = await requireUser();
  const profile = await getProfile(user.uid);
  if (!profile) redirect("/onboarding");

  // Takip listesi isteğe bağlıdır: ulaşılamazsa ya da boşsa genel mesaj yazılabilir.
  let favorites: FavoriteWithNotes[] = [];
  try {
    favorites = await listFavorites(user.uid);
  } catch (e) {
    if (!(e instanceof FavoritesUnavailableError)) throw e;
  }

  let contacts: ContactPick[] = [];
  try {
    contacts = await listContactPicks(user.uid);
  } catch (e) {
    if (!(e instanceof OutreachUnavailableError)) throw e;
  }

  const sp = await searchParams;
  const kisiId = one(sp.kisi);
  const firmaId = one(sp.firma);
  const firm = firmaId && z.uuid().safeParse(firmaId).success ? await loadWorkFirm(user.uid, firmaId) : null;

  return (
    <WorkWorkspace
      favorites={favorites.map((f) => ({ id: f.id, name: f.name, district: f.city, category: f.category }))}
      contacts={contacts}
      initialContactId={kisiId && contacts.some((c) => c.id === kisiId) ? kisiId : null}
      firm={firm}
      initialKind={one(sp.arac) === "email" ? "email" : "message"}
      services={profile.services.map((value) => ({ value, label: serviceLabel(value) }))}
      suggestedService={firm ? suggestService(profile.services, firm.hasWebsite) : (profile.services[0] ?? null)}
    />
  );
}

export default function WorkPage(props: PageProps<"/panel/calis">) {
  return (
    <Suspense fallback={<ComposerSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
