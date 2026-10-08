import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { FavoritesUnavailableError, listFavorites, type FavoriteWithNotes } from "@/modules/favorites/repository";
import { getProfile } from "@/modules/profile/repository";
import { listPlan, PlanUnavailableError } from "@/modules/plan/repository";
import type { PlanItem } from "@/modules/plan/types";
import { PageSkeleton } from "../../../_components/skeletons";
import { PlanWorkspace } from "./_components/plan-workspace";

export const metadata: Metadata = { title: "Plan" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

/** Türkiye saatine (UTC+3, yaz saati yok) göre bugünün gün anahtarı: "2026-10-08". */
function istanbulToday(now: number) {
  const t = new Date(now + 3 * 3_600_000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

async function Content({ searchParams }: { searchParams: PageProps<"/panel/plan">["searchParams"] }) {
  const user = await requireUser();
  if (!(await getProfile(user.uid))) redirect("/onboarding");

  let favorites: FavoriteWithNotes[] = [];
  try {
    favorites = await listFavorites(user.uid);
  } catch (e) {
    if (!(e instanceof FavoritesUnavailableError)) throw e;
  }

  const now = Date.now();
  let items: PlanItem[] = [];
  let unavailable = false;
  try {
    // Açılışta bugünün çevresi (yaklaşık 4 ay) yüklenir; diğer aylar gezilirken istemci ister.
    items = await listPlan(user.uid, new Date(now - 45 * 86_400_000), new Date(now + 75 * 86_400_000));
  } catch (e) {
    if (!(e instanceof PlanUnavailableError)) throw e;
    unavailable = true;
  }

  const sp = await searchParams;
  const firma = one(sp.firma);
  return (
    <PlanWorkspace
      favorites={favorites.map((f) => ({ id: f.id, name: f.name, category: f.category, district: f.city }))}
      initialItems={items}
      unavailable={unavailable}
      todayKey={istanbulToday(now)}
      nowMs={now}
      openFirmId={firma && z.uuid().safeParse(firma).success && one(sp.yeni) === "1" ? firma : null}
    />
  );
}

export default function PlanPage(props: PageProps<"/panel/plan">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
