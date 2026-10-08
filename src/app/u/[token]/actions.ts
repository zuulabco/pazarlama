"use server";

import { redirect } from "next/navigation";
import { applyUnsubscribe } from "@/modules/outreach/unsubscribe";

/** "Abonelikten çık" düğmesi: kişiyi kara listeye alır ve onay sayfasına döner. */
export async function confirmUnsubscribe(token: string) {
  const ok = await applyUnsubscribe(token).catch(() => false);
  redirect(`/u/${encodeURIComponent(token)}?${ok ? "tamam=1" : "hata=1"}`);
}
