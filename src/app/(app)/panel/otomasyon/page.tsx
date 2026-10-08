import { redirect } from "next/navigation";

/** Eski karşılama sayfası: Otomasyon artık doğrudan Kişi bul ile açılır. */
export default function AutomationIndex() {
  redirect("/panel/kisi-bul");
}
