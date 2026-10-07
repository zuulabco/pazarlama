import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { getProfile, getProfileDraft } from "@/modules/profile/repository";
import { Wizard } from "./_components/wizard";

export const metadata: Metadata = { title: "Bilgi kartınız" };

async function OnboardingGate({ searchParams }: { searchParams: PageProps<"/onboarding">["searchParams"] }) {
  const user = await requireUser();
  const edit = (await searchParams).edit === "1";
  const profile = await getProfile(user.uid);

  // Tamamlanmış kullanıcı yalnızca "Bilgi kartım" ile (?edit=1) buraya gelebilir.
  if (profile && !edit) redirect("/panel");

  // Cache Components, sayfadan ayrılınca istemci durumunu saklar; geri dönüldüğünde önceki ziyaretin
  // "tamamlandı" ekranı gelmesin diye her ziyaret yeni bir anahtarla (yeni durum) açılır.
  const visit = crypto.randomUUID();

  return profile ? (
    <Wizard key={visit} defaultName={user.name ?? ""} initial={profile} mode="edit" />
  ) : (
    <Wizard key={visit} defaultName={user.name ?? ""} initial={await getProfileDraft(user.uid)} />
  );
}

export default function OnboardingPage(props: PageProps<"/onboarding">) {
  return (
    <Suspense fallback={<div className="min-h-dvh flex-1 bg-paper" aria-hidden="true" />}>
      <OnboardingGate searchParams={props.searchParams} />
    </Suspense>
  );
}
