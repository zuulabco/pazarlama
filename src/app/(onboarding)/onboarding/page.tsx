import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { getProfile, getProfileDraft } from "@/modules/profile/repository";
import { Wizard } from "./_components/wizard";

export const metadata: Metadata = { title: "Hedefinizi anlatın" };

async function OnboardingGate() {
  const user = await requireUser();
  if (await getProfile(user.uid)) redirect("/panel");
  const draft = await getProfileDraft(user.uid);
  return <Wizard defaultName={user.name ?? ""} initial={draft} />;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex-1 bg-paper" aria-hidden="true" />}>
      <OnboardingGate />
    </Suspense>
  );
}
