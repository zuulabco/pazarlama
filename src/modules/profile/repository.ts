import "server-only";
import { db } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/auth/session";
import { profileSchema, type ProfileInput } from "./schema";

export type Profile = ProfileInput & { completedAt: string };

type Row = {
  business_name: string | null;
  work_type: string | null;
  services: string[];
  target_sectors: string[];
  target_cities: string[];
  target_size: string | null;
  deal_value: string | null;
  /** Sık değişen / yeni alanlar: businessDescription, cityScope, channels, signals, signalNotes */
  extra: Record<string, unknown> | null;
  onboarding_completed_at: string | null;
};

const columns =
  "business_name, work_type, services, target_sectors, target_cities, target_size, deal_value, extra, onboarding_completed_at";

async function readRow(uid: string) {
  const { data, error } = await db().from("profiles").select(columns).eq("firebase_uid", uid).maybeSingle<Row>();
  if (error) throw new Error(`Profil okunamadı: ${error.message}`);
  return data;
}

function toDraft(row: Row) {
  const extra = row.extra ?? {};
  return {
    businessName: row.business_name ?? undefined,
    workType: row.work_type ?? undefined,
    businessDescription: extra.businessDescription,
    services: row.services,
    targetSectors: row.target_sectors,
    targetSizes: row.target_size ? row.target_size.split(",") : undefined,
    cityScope: extra.cityScope,
    targetCities: row.target_cities,
    channels: extra.channels,
    dealValue: row.deal_value ?? undefined,
    signals: extra.signals,
    signalNotes: extra.signalNotes,
  };
}

/** Onboarding eksiksiz tamamlanmışsa profili, aksi halde null döner. */
export async function getProfile(uid: string): Promise<Profile | null> {
  const row = await readRow(uid);
  if (!row?.onboarding_completed_at) return null;
  const parsed = profileSchema.safeParse(toDraft(row));
  // Alanlar sonradan eklendiği için eski kayıtlar doğrulamadan geçemez; onboarding yeniden gösterilir.
  return parsed.success ? { ...parsed.data, completedAt: row.onboarding_completed_at } : null;
}

/** Yarım kalmış ya da eski bir kayıttaki cevapları, sihirbazı önceden doldurmak için döndürür. */
export async function getProfileDraft(uid: string): Promise<Partial<ProfileInput>> {
  const row = await readRow(uid);
  if (!row) return {};
  const draft = toDraft(row);
  // Geçerli (şemaya uyan) alanları al, geri kalanını boş bırak.
  return Object.fromEntries(
    Object.entries(draft).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0)),
  ) as Partial<ProfileInput>;
}

/**
 * Profili kaydeder. `completing: true` (onboarding) tamamlanma zamanını yazar; profil sayfasındaki
 * güncellemelerde (`false`) ilk tamamlanma zamanı korunur.
 */
export async function saveProfile(user: SessionUser, input: ProfileInput, completing = true) {
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
        target_size: input.targetSizes.join(","),
        deal_value: input.dealValue,
        extra: {
          businessDescription: input.businessDescription,
          cityScope: input.cityScope,
          channels: input.channels,
          signals: input.signals,
          signalNotes: input.signalNotes,
        },
        ...(completing ? { onboarding_completed_at: new Date().toISOString() } : {}),
      },
      { onConflict: "firebase_uid" },
    );
  if (error) throw new Error(`Profil kaydedilemedi: ${error.message}`);
}
