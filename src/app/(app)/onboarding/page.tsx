import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/modules/profile/repository";
import { Wizard } from "./_components/wizard";

export const metadata: Metadata = { title: "Hedefinizi anlatın" };

async function OnboardingGate() {
  const user = await requireUser();
  if (await getProfile(user.uid)) redirect("/panel");
  return <Wizard defaultName={user.name ?? ""} />;
}

export default function OnboardingPage() {
  return (
    <div className="mx-auto w-full max-w-[34rem]">
      <Suspense fallback={<div className="h-96 rounded-panel bg-sunken" />}>
        <OnboardingGate />
      </Suspense>
    </div>
  );
}
