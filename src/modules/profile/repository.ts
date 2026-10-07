import "server-only";
import { db } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/auth/session";
import type { ProfileInput } from "./schema";

export type Profile = ProfileInput & {
  completedAt: string;
};

type Row = {
  business_name: string | null;
  work_type: ProfileInput["workType"] | null;
  services: ProfileInput["services"];
  target_sectors: ProfileInput["targetSectors"];
  target_cities: string[];
  target_size: ProfileInput["targetSize"] | null;
  deal_value: ProfileInput["dealValue"] | null;
  onboarding_completed_at: string | null;
};

const columns =
  "business_name, work_type, services, target_sectors, target_cities, target_size, deal_value, onboarding_completed_at";

/** Onboarding tamamlanmışsa profili, tamamlanmamışsa null döner. */
export async function getProfile(uid: string): Promise<Profile | null> {
  const { data, error } = await db().from("profiles").select(columns).eq("firebase_uid", uid).maybeSingle<Row>();
  if (error) throw new Error(`Profil okunamadı: ${error.message}`);
  if (!data?.onboarding_completed_at || !data.business_name || !data.work_type || !data.target_size || !data.deal_value) {
    return null;
  }
  return {
    businessName: data.business_name,
    workType: data.work_type,
    services: data.services,
    targetSectors: data.target_sectors,
    targetCities: data.target_cities,
    targetSize: data.target_size,
    dealValue: data.deal_value,
    completedAt: data.onboarding_completed_at,
  };
}

export async function saveProfile(user: SessionUser, input: ProfileInput) {
  const { error } = await db()
    .from("profiles")
    .upsert(
      {
        firebase_uid: user.uid,
        email: user.email,
        display_name: user.name,
        business_name: input.businessName,
        work_type: input.workType,
        services: input.services,
        target_sectors: input.targetSectors,
        target_cities: input.targetCities,
        target_size: input.targetSize,
        deal_value: input.dealValue,
        onboarding_completed_at: new Date().toISOString(),
      },
      { onConflict: "firebase_uid" },
    );
  if (error) throw new Error(`Profil kaydedilemedi: ${error.message}`);
}
