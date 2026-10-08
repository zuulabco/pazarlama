import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/auth/origin";
import { getSessionUser } from "@/lib/auth/session";
import { LlmUnavailableError } from "@/lib/llm/nvidia";
import { askLimits } from "@/modules/leads/ask/parse";
import { answerQuestion } from "@/modules/leads/ask/run";
import { getSearch, listScoredLeads } from "@/modules/leads/repository";
import { getProfile } from "@/modules/profile/repository";

export const maxDuration = 60;

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

const bodySchema = z.object({
  searchId: z.uuid(),
  question: z.string().trim().min(3, "Sorunuzu biraz daha açın.").max(askLimits.maxQuestion, `Soru en fazla ${askLimits.maxQuestion} karakter olabilir.`),
});

/**
 * Kullanıcı başına dakikada en çok 8 soru. Sunucusuz ortamda her örnek kendi sayacını tutar; bu,
 * hızlı art arda isteği (yanlışlıkla ya da kötü niyetle) kesen bir ilk savunmadır.
 */
const recent = new Map<string, number[]>();
function tooFast(uid: string) {
  const now = Date.now();
  const hits = (recent.get(uid) ?? []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(uid, hits);
  if (recent.size > 500) for (const [k, v] of recent) if (v.every((t) => now - t >= 60_000)) recent.delete(k);
  return hits.length > 8;
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return error("Geçersiz istek kaynağı.", 403);
  const user = await getSessionUser();
  if (!user) return error("Oturumunuz sona erdi. Tekrar giriş yapın.", 401);
  if (tooFast(user.uid)) return error("Çok hızlı soruyorsunuz. Birkaç saniye bekleyip tekrar deneyin.", 429);

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return error(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);

  const [search, profile] = await Promise.all([getSearch(user.uid, body.data.searchId), getProfile(user.uid)]);
  if (!search) return error("Arama bulunamadı.", 404);
  if (!profile) return error("Önce hesap kurulumunu tamamlayın.", 409);

  try {
    const leads = await listScoredLeads(user.uid, search.id);
    if (leads.length === 0) return error("Bu aramada henüz puanlanmış firma yok.", 409);
    return NextResponse.json(await answerQuestion(body.data.question, leads, profile));
  } catch (e) {
    if (e instanceof LlmUnavailableError || e instanceof z.ZodError || e instanceof SyntaxError) {
      console.error("Soru yanıtlanamadı (yapay zekâ):", e instanceof Error ? e.message : e);
      return error("Adspine AI şu an yanıt veremedi. Filtre ve sıralama sorularını (ör. “web sitesi olmayanlar”) yine sorabilirsiniz; biraz sonra tekrar deneyin.", 503);
    }
    console.error("Soru yanıtlanamadı:", e);
    return error("Soru yanıtlanamadı. Tekrar deneyin.", 500);
  }
}
