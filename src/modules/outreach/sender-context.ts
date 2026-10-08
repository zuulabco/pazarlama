import "server-only";
import { getProfile } from "@/modules/profile/repository";
import { labelOf, workTypes } from "@/modules/profile/options";
import { serviceLabel } from "@/modules/work/context";
import type { SenderContext } from "./ai-prompts";

/** Yapay zekâ istemlerine verilecek gönderici bağlamı: kullanıcının onboarding'de verdiği bilgiler. Profil yoksa null. */
export async function senderContextFor(uid: string, displayName: string | null | undefined): Promise<SenderContext | null> {
  const p = await getProfile(uid);
  if (!p) return null;
  return {
    businessName: p.businessName,
    firstName: displayName?.split(" ")[0] ?? null,
    workType: labelOf(workTypes, p.workType),
    services: p.services.map(serviceLabel),
    description: p.businessDescription ?? "",
  };
}
