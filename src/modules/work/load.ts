import "server-only";
import { getProfile } from "@/modules/profile/repository";
import type { WorkSender } from "./context";

/** Taslağı yazan kullanıcının (işletmesinin) bilgileri. */
export async function loadSender(uid: string, name: string | null | undefined): Promise<WorkSender | null> {
  const p = await getProfile(uid);
  if (!p) return null;
  return {
    businessName: p.businessName,
    firstName: name?.split(" ")[0] ?? null,
    workType: p.workType,
    services: p.services,
    description: p.businessDescription ?? "",
  };
}
