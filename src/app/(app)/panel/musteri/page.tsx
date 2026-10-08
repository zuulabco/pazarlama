import { redirect } from "next/navigation";

/** Eski karşılama sayfası: Firmalar artık doğrudan Firma bul ile açılır. */
export default function CustomerIndex() {
  redirect("/panel/musteri-bul");
}
