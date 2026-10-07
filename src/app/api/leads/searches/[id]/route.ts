import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/auth/origin";
import { getSessionUser } from "@/lib/auth/session";
import { advanceSearch } from "@/modules/leads/pipeline";
import { deleteSearch, getSearch, isActive } from "@/modules/leads/repository";

// Skorlama bu istek içinde bitebilir; Vercel'de varsayılan süre yetmeyebilir.
export const maxDuration = 120;

/**
 * Arama durumunu döndürür. Arama sürüyorsa bir adım ilerletir: Apify koşusu bitmişse
 * firmaları alıp skorlar. Webhook gelmese bile arama bu sayede tamamlanır.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/leads/searches/[id]">) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Oturumunuz sona erdi." }, { status: 401 });

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Arama bulunamadı." }, { status: 404 });

  const search = await getSearch(user.uid, id);
  if (!search) return NextResponse.json({ error: "Arama bulunamadı." }, { status: 404 });

  const state = search.status === "scraping" || search.status === "scoring" ? ((await advanceSearch(id)) ?? search) : search;
  return NextResponse.json({
    status: state.status,
    found: state.total_found,
    scored: state.total_scored,
    max: search.max_results,
    error: state.error,
  });
}

/** Geçmiş aramayı siler. Devam eden arama silinemez (koşu hâlâ firma ekliyor olabilir). */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/leads/searches/[id]">) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Oturumunuz sona erdi." }, { status: 401 });

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Arama bulunamadı." }, { status: 404 });

  const search = await getSearch(user.uid, id);
  if (!search) return NextResponse.json({ error: "Arama bulunamadı." }, { status: 404 });
  if (isActive(search.status)) {
    return NextResponse.json({ error: "Devam eden arama silinemez. Tamamlanmasını bekleyin." }, { status: 409 });
  }
  await deleteSearch(user.uid, id);
  return NextResponse.json({ ok: true });
}
