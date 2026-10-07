import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/auth/origin";
import { getSessionUser } from "@/lib/auth/session";
import { FavoritesUnavailableError, updateFavorite } from "@/modules/favorites/repository";
import { followStatusValues } from "@/modules/favorites/status";

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

const patchSchema = z
  .object({
    status: z.enum(followStatusValues),
  });

/** Takipteki firmanın aşamasını günceller. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/favorites/[id]">) {
  if (!isSameOrigin(req)) return error("Geçersiz istek kaynağı.", 403);
  const user = await getSessionUser();
  if (!user) return error("Oturumunuz sona erdi. Tekrar giriş yapın.", 401);

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return error("Firma bulunamadı.", 404);

  const body = patchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return error(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);

  try {
    const updated = await updateFavorite(user.uid, id, body.data);
    return updated ? NextResponse.json({ ok: true }) : error("Firma bulunamadı.", 404);
  } catch (e) {
    if (e instanceof FavoritesUnavailableError) return error("Takip listesi henüz etkinleştirilmedi.", 503);
    console.error("Favori güncellenemedi:", e);
    return error("Kaydedilemedi. Tekrar deneyin.", 500);
  }
}
