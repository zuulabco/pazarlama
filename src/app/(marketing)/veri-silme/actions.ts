"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { removeFromPool } from "@/modules/outreach/lead-pool";

const emailSchema = z.string().trim().toLowerCase().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/);
const hits = new Map<string, number[]>();

/** Süreç başına, IP başına saatte en çok 8 talep (kötüye kullanıma karşı ilk savunma). */
function tooMany(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 1000) for (const [k, v] of hits) if (v.every((t) => now - t >= 3_600_000)) hits.delete(k);
  return list.length > 8;
}

/**
 * Veri silme talebi: e-posta adresi ortak kişi havuzundan silinir ve bir daha eklenmez. Doğrulama e-postası yoktur; bu işlem yalnızca
 * havuz kaydını siler (kimseye veri vermez), bu yüzden kötüye kullanımın etkisi sınırlıdır.
 */
export async function requestRemoval(formData: FormData) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "bilinmiyor";
  if (tooMany(ip)) redirect("/veri-silme?hata=cok-fazla");
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) redirect("/veri-silme?hata=gecersiz");
  try {
    await removeFromPool(email.data);
  } catch (e) {
    console.error("Veri silme talebi işlenemedi:", e instanceof Error ? e.message : e);
    redirect("/veri-silme?hata=sunucu");
  }
  redirect("/veri-silme?tamam=1");
}
