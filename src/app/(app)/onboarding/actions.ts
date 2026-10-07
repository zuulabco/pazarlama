"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { saveProfile } from "@/modules/profile/repository";
import { profileSchema } from "@/modules/profile/schema";

export type OnboardingResult = { error: string } | undefined;

export async function completeOnboarding(input: unknown): Promise<OnboardingResult> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: "Bazı bilgiler eksik ya da hatalı. Adımları kontrol edip tekrar deneyin." };

  try {
    await saveProfile(user, parsed.data);
  } catch {
    return { error: "Bilgileriniz kaydedilemedi. Birkaç saniye sonra tekrar deneyin." };
  }
  redirect("/panel");
}
