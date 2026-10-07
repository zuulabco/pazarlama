import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/modules/profile/repository";

export const metadata: Metadata = { title: "Panel" };

async function PanelContent() {
  const user = await requireUser();
  const profile = await getProfile(user.uid);
  if (!profile) redirect("/onboarding");

  const firstName = user.name?.split(" ")[0];
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {firstName ? `Merhaba ${firstName}` : "Merhaba"}
      </h1>
      <p className="mt-3 max-w-prose text-muted">
        {profile.businessName} için hedefiniz kaydedildi. Müşteri Bul modülü bir sonraki adımda burada olacak.
      </p>
    </>
  );
}

export default function PanelPage() {
  return (
    <Suspense fallback={<div className="h-10 w-48 rounded-control bg-sunken" />}>
      <PanelContent />
    </Suspense>
  );
}
