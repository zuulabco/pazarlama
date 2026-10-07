import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/auth/origin";
import { getSessionUser } from "@/lib/auth/session";
import { addFavorite, FavoritesUnavailableError, favoriteIdByPlace, removeFavorite } from "@/modules/favorites/repository";
import { getLeadForUser, getSearch } from "@/modules/leads/repository";

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

function unavailable(e: unknown) {
  if (e instanceof FavoritesUnavailableError) {
    return error("Takip listesi henüz etkinleştirilmedi. Kısa süre sonra tekrar deneyin.", 503);
  }
  console.error("Favori işlemi başarısız:", e);
  return error("İşlem tamamlanamadı. Tekrar deneyin.", 500);
}

/** Firmayı takibe alır (zaten takipteyse dokunmaz) ve takip kimliğini döndürür. Gövde: { leadId }. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return error("Geçersiz istek kaynağı.", 403);
  const user = await getSessionUser();
  if (!user) return error("Oturumunuz sona erdi. Tekrar giriş yapın.", 401);

  const body = z.object({ leadId: z.uuid() }).safeParse(await req.json().catch(() => null));
  if (!body.success) return error("Geçersiz istek.", 400);

  try {
    const lead = await getLeadForUser(user.uid, body.data.leadId);
    if (!lead) return error("Firma bulunamadı.", 404);
    const search = await getSearch(user.uid, lead.search_id);
    await addFavorite(user.uid, lead, search ? `${search.query} · ${search.location}` : "");
    return NextResponse.json({ ok: true, id: await favoriteIdByPlace(user.uid, lead.place_id) }, { status: 201 });
  } catch (e) {
    return unavailable(e);
  }
}

/** Firmayı takipten çıkarır. Sorgu parametresi: ?placeId=... */
export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return error("Geçersiz istek kaynağı.", 403);
  const user = await getSessionUser();
  if (!user) return error("Oturumunuz sona erdi. Tekrar giriş yapın.", 401);

  const placeId = req.nextUrl.searchParams.get("placeId") ?? "";
  if (!placeId || placeId.length > 200) return error("Geçersiz istek.", 400);

  try {
    await removeFavorite(user.uid, placeId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return unavailable(e);
  }
}
