import { redirect } from "next/navigation";

/** Google Haritalar'dan yerel işletme araması kaldırıldı; müşteri bulma tek yerde (kişi araması) toplandı. */
export default function LegacyFirmSearch() {
  redirect("/panel/kisi-bul");
}
