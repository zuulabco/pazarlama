import "server-only";
import { NextResponse } from "next/server";
import { PlanUnavailableError } from "./repository";

/** Plan API'lerinin ortak hata yanıtı. Route dosyaları yalnızca HTTP işleyicilerini dışa aktarabildiği için burada. */
export function planFailure(e: unknown) {
  if (e instanceof PlanUnavailableError) {
    return NextResponse.json({ error: "Plan özelliği henüz etkinleştirilmedi. Kısa süre sonra tekrar deneyin." }, { status: 503 });
  }
  if (e instanceof Error && e.message.startsWith("En fazla")) return NextResponse.json({ error: e.message }, { status: 409 });
  console.error("Plan işlemi başarısız:", e);
  return NextResponse.json({ error: "İşlem tamamlanamadı. Tekrar deneyin." }, { status: 500 });
}
