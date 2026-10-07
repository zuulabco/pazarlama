import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/auth/origin";
import { getSessionUser } from "@/lib/auth/session";
import { chatJson, LlmUnavailableError } from "@/lib/llm/nvidia";
import { buildMessages, goalValues, parseDraft, toneValues } from "@/modules/work/context";
import { loadSender, loadWorkFirm } from "@/modules/work/load";
import { proofread } from "@/modules/work/proofread";

export const maxDuration = 60;

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

const bodySchema = z.object({
  favoriteId: z.uuid(),
  kind: z.enum(["message", "email"]),
  goal: z.enum(goalValues),
  tone: z.enum(toneValues),
  service: z.string().trim().max(80).nullish(),
});

/** Kullanıcı başına dakikada en çok 6 taslak (sunucu örneği başına ilk savunma; bkz. api/leads/ask). */
const recent = new Map<string, number[]>();
function tooFast(uid: string) {
  const now = Date.now();
  const hits = (recent.get(uid) ?? []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(uid, hits);
  if (recent.size > 500) for (const [k, v] of recent) if (v.every((t) => now - t >= 60_000)) recent.delete(k);
  return hits.length > 6;
}

/** Takipteki bir firma için kişiselleştirilmiş mesaj ya da e-posta taslağı üretir. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return error("Geçersiz istek kaynağı.", 403);
  const user = await getSessionUser();
  if (!user) return error("Oturumunuz sona erdi. Tekrar giriş yapın.", 401);
  if (tooFast(user.uid)) return error("Çok hızlı taslak istiyorsunuz. Birkaç saniye bekleyip tekrar deneyin.", 429);

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return error("Geçersiz istek.", 400);
  const { favoriteId, kind, goal, tone, service } = body.data;

  const [firm, sender] = await Promise.all([loadWorkFirm(user.uid, favoriteId), loadSender(user.uid, user.name)]);
  if (!firm) return error("Müşteri bulunamadı.", 404);
  if (!sender) return error("Önce hesap kurulumunu tamamlayın.", 409);

  try {
    const raw = await chatJson(buildMessages({ kind, goal, tone, service: service || null, firm, sender }), { maxTokens: 1500, timeoutMs: 40_000, thinking: false, temperature: 0.1 });
    return NextResponse.json(await proofread(kind, parseDraft(kind, raw)));
  } catch (e) {
    if (e instanceof LlmUnavailableError || e instanceof z.ZodError || e instanceof SyntaxError) {
      console.error("Taslak üretilemedi:", e instanceof Error ? e.message : e);
      return error("Taslak şu an hazırlanamadı. Biraz sonra tekrar deneyin.", 503);
    }
    console.error("Taslak üretilemedi:", e);
    return error("Taslak hazırlanamadı. Tekrar deneyin.", 500);
  }
}
