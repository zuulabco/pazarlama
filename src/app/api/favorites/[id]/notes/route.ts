import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/auth/origin";
import { getSessionUser } from "@/lib/auth/session";
import { addNote, deleteNote, FavoritesUnavailableError, NotesUnavailableError } from "@/modules/favorites/repository";

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

const bodySchema = z.object({
  text: z.string().trim().min(1, "Mesaj boş olamaz.").max(500, "Mesaj en fazla 500 karakter olabilir."),
});

function failure(e: unknown) {
  if (e instanceof NotesUnavailableError || e instanceof FavoritesUnavailableError) {
    return error("Notlar için veritabanı güncellemesi gerekiyor. Kısa süre sonra tekrar deneyin.", 503);
  }
  if (e instanceof Error && e.message.startsWith("Bir firmaya en fazla")) return error(e.message, 409);
  console.error("Not işlemi başarısız:", e);
  return error("İşlem tamamlanamadı. Tekrar deneyin.", 500);
}

/** Takipteki firmaya yeni bir not ekler. Gövde: { text }. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/favorites/[id]/notes">) {
  if (!isSameOrigin(req)) return error("Geçersiz istek kaynağı.", 403);
  const user = await getSessionUser();
  if (!user) return error("Oturumunuz sona erdi. Tekrar giriş yapın.", 401);

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return error("Firma bulunamadı.", 404);
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return error(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);

  try {
    const note = await addNote(user.uid, id, body.data.text);
    return note ? NextResponse.json({ note }, { status: 201 }) : error("Firma bulunamadı.", 404);
  } catch (e) {
    return failure(e);
  }
}

/** Notu siler. Sorgu parametresi: ?noteId=... */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/favorites/[id]/notes">) {
  if (!isSameOrigin(req)) return error("Geçersiz istek kaynağı.", 403);
  const user = await getSessionUser();
  if (!user) return error("Oturumunuz sona erdi. Tekrar giriş yapın.", 401);

  const { id } = await ctx.params;
  const noteId = req.nextUrl.searchParams.get("noteId") ?? "";
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(noteId).success) return error("Not bulunamadı.", 404);

  try {
    await deleteNote(user.uid, id, noteId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
