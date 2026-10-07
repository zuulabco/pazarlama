"use server";

import { requireUser } from "@/lib/auth/session";
import { getProfile, saveProfile } from "@/modules/profile/repository";
import { profileSchema, stepSchemas } from "@/modules/profile/schema";

export type SectionResult = { ok: true } | { ok: false; error: string; fields?: Record<string, string> };

/**
 * Profilin tek bir bölümünü günceller. Bölümün alanları doğrulanır, mevcut profille birleştirilir ve
 * tüm profil yeniden doğrulanarak kaydedilir; diğer bölümlere dokunulmaz.
 */
export async function saveProfileSection(section: unknown, input: unknown): Promise<SectionResult> {
  const user = await requireUser();

  if (typeof section !== "string" || !(section in stepSchemas)) {
    return { ok: false, error: "Geçersiz bölüm." };
  }
  const parsed = stepSchemas[section as keyof typeof stepSchemas].safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "Bazı alanlar eksik ya da hatalı.", fields };
  }

  const current = await getProfile(user.uid);
  if (!current) return { ok: false, error: "Profiliniz bulunamadı. Önce hesap kurulumunu tamamlayın." };

  const { completedAt, ...base } = current;
  void completedAt;
  const merged = profileSchema.safeParse({ ...base, ...parsed.data });
  if (!merged.success) return { ok: false, error: "Bilgiler birbiriyle uyuşmuyor. Sayfayı yenileyip tekrar deneyin." };

  try {
    await saveProfile(user, merged.data, false);
  } catch {
    return { ok: false, error: "Kaydedilemedi. Birkaç saniye sonra tekrar deneyin." };
  }
  return { ok: true };
}
