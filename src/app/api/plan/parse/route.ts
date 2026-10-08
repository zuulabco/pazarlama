import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/auth/origin";
import { getSessionUser } from "@/lib/auth/session";
import { chatJson, LlmUnavailableError } from "@/lib/llm/nvidia";
import { FavoritesUnavailableError, listFavorites } from "@/modules/favorites/repository";
import { matchFavorite, parseMessages, parsePlanOutput } from "@/modules/plan/parse";

export const maxDuration = 60;

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

const bodySchema = z.object({ text: z.string().trim().min(3, "Planı birkaç kelimeyle yazın.").max(400, "En fazla 400 karakter.") });

/** Kullanıcı başına dakikada en çok 10 istek (sunucu örneği başına ilk savunma; bkz. api/work/generate). */
const recent = new Map<string, number[]>();
function tooFast(uid: string) {
  const now = Date.now();
  const hits = (recent.get(uid) ?? []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(uid, hits);
  if (recent.size > 500) for (const [k, v] of recent) if (v.every((t) => now - t >= 60_000)) recent.delete(k);
  return hits.length > 10;
}

/**
 * Serbest yazıyı ("Cuma 14:30 Moda Kafe ile görüşme") plan taslağına çevirir. Kayıt yapmaz: sonuç forma
 * doldurulur, kullanıcı kontrol edip kaydeder.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return error("Geçersiz istek kaynağı.", 403);
  const user = await getSessionUser();
  if (!user) return error("Oturumunuz sona erdi. Tekrar giriş yapın.", 401);
  if (tooFast(user.uid)) return error("Çok hızlı istek gönderiyorsunuz. Birkaç saniye bekleyip tekrar deneyin.", 429);

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return error(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);

  try {
    const raw = await chatJson(parseMessages(body.data.text, new Date()), { maxTokens: 600, timeoutMs: 25_000, thinking: false, temperature: 0 });
    const parsed = parsePlanOutput(raw);

    let favorites: { id: string; name: string }[] = [];
    try {
      favorites = (await listFavorites(user.uid)).map((f) => ({ id: f.id, name: f.name }));
    } catch (e) {
      if (!(e instanceof FavoritesUnavailableError)) throw e;
    }
    // Firma, kullanıcının yazdığı metinden kuralla bulunur; bulunamazsa modelin yazdığı ad serbest kişi adı olur.
    const match = matchFavorite(`${body.data.text} ${parsed.withName ?? ""}`, favorites);
    return NextResponse.json({ ...parsed, favoriteId: match?.id ?? null, withName: match?.name ?? parsed.withName });
  } catch (e) {
    if (e instanceof LlmUnavailableError || e instanceof z.ZodError || e instanceof SyntaxError) {
      console.error("Plan yazısı çözülemedi:", e instanceof Error ? e.message : e);
      return error("Yazıdan bir plan çıkaramadık. Tarihi ve saati ekleyerek tekrar deneyin ya da formu elle doldurun.", 422);
    }
    console.error("Plan yazısı çözülemedi:", e);
    return error("Plan hazırlanamadı. Tekrar deneyin.", 500);
  }
}
