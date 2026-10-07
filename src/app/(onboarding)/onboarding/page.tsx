import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { getProfile, getProfileDraft } from "@/modules/profile/repository";
import { Wizard } from "./_components/wizard";

export const metadata: Metadata = { title: "Hesabınızı kuralım" };

async function OnboardingGate() {
  const user = await requireUser();
  // Tamamlanmış kullanıcılar bilgilerini profil sayfasından yönetir.
  if (await getProfile(user.uid)) redirect("/panel/profil");

  // Cache Components, sayfadan ayrılınca istemci durumunu saklar; geri dönüldüğünde önceki ziyaretin
  // "tamamlandı" ekranı gelmesin diye her ziyaret yeni bir anahtarla (yeni durum) açılır.
  const visit = crypto.randomUUID();
  return <Wizard key={visit} defaultName={user.name ?? ""} initial={await getProfileDraft(user.uid)} />;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex-1 bg-paper" aria-hidden="true" />}>
      <OnboardingGate />
    </Suspense>
  );
}
