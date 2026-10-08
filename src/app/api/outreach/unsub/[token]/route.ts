import { NextResponse, type NextRequest } from "next/server";
import { applyUnsubscribe } from "@/modules/outreach/unsubscribe";

/**
 * Tek tıkla abonelikten çıkma (RFC 8058): posta istemcileri `List-Unsubscribe` başlığındaki bu adrese POST eder.
 * Oturum gerekmez; yetki, imzalı jetonun kendisidir. İnsanlar GET ile gelirse çıkma sayfasına yönlendirilir
 * (bağlantı tarayıcıları yanlışlıkla çıkarmasın diye GET hiçbir şey değiştirmez).
 */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/outreach/unsub/[token]">) {
  const { token } = await ctx.params;
  const ok = await applyUnsubscribe(token).catch(() => false);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Geçersiz bağlantı." }, { status: 400 });
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/outreach/unsub/[token]">) {
  const { token } = await ctx.params;
  return NextResponse.redirect(new URL(`/u/${token}`, req.nextUrl.origin), 303);
}
