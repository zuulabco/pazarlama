"use server";

import { requireUser } from "@/lib/auth/session";
import { normalizeSiteUrl } from "@/lib/url";
import type { Draft } from "@/modules/profile/draft";
import { saveProfile } from "@/modules/profile/repository";
import { analyzeSite } from "@/modules/profile/site/analyze";
import { filledKeys } from "@/modules/profile/site/sanitize";
import { profileSchema } from "@/modules/profile/schema";

export type OnboardingResult = { ok: true } | { ok: false; error: string };

export async function completeOnboarding(input: unknown): Promise<OnboardingResult> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Bazı bilgiler eksik ya da hatalı. Adımları kontrol edip tekrar deneyin." };
  }

  try {
    await saveProfile(user, parsed.data);
  } catch {
    return { ok: false, error: "Bilgileriniz kaydedilemedi. Birkaç saniye sonra tekrar deneyin." };
  }
  return { ok: true };
}

export type SiteResult = { ok: true; draft: Partial<Draft>; filled: (keyof Draft)[] } | { ok: false; error: string };

/** Kullanıcı başına kısa süreli sınır (örnek başına, en iyi çaba): art arda analizle kaynak tüketilmesini önler. */
const recent = new Map<string, number[]>();
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 6;

function tooMany(uid: string): boolean {
  const now = Date.now();
  const hits = (recent.get(uid) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) return true;
  recent.set(uid, [...hits, now]);
  return false;
}

/** Firmanın web sitesini okuyup onboarding cevaplarını önceden doldurur. İsteğe bağlıdır; hata verirse kullanıcı elle devam eder. */
export async function analyzeSiteAction(input: unknown): Promise<SiteResult> {
  const user = await requireUser();

  const url = typeof input === "string" ? normalizeSiteUrl(input) : null;
  if (!url) return { ok: false, error: "Geçerli bir site adresi yazın (örn. firmaniz.com)." };
  if (tooMany(user.uid)) return { ok: false, error: "Kısa sürede çok fazla deneme yaptınız. Birkaç dakika sonra tekrar deneyin ya da bilgileri elle girin." };

  try {
    const result = await analyzeSite(url);
    return result.ok ? { ok: true, draft: result.draft, filled: filledKeys(result.draft) } : result;
  } catch {
    return { ok: false, error: "Site şu an analiz edilemedi. Bilgileri kendiniz girerek devam edebilirsiniz." };
  }
}
