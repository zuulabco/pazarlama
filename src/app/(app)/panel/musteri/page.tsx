import { redirect } from "next/navigation";

/** Eski karşılama sayfası: müşteri bulma artık Kişi araması ile açılır. */
export default function CustomerIndex() {
  redirect("/panel/kisi-bul");
}
