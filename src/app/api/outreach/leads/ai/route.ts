import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { LlmUnavailableError } from "@/lib/llm/nvidia";
import { fail, guard, outreachFailure, rateLimiter } from "@/modules/outreach/http";
import { aiLeadFilters } from "@/modules/outreach/lead-ai";

export const maxDuration = 60;

const tooFast = rateLimiter(10);

/** "Yapay zekâ ile ara": doğal dildeki isteği süzgeçlere çevirir (arama başlatmaz, kredi düşmez). */
export async function POST(req: NextRequest) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  if (tooFast(g.user.uid)) return fail("Çok hızlı istek gönderiyorsunuz. Biraz bekleyin.", 429);
  const body = z.object({ text: z.string().trim().min(4, "Kimi aradığınızı birkaç kelimeyle yazın.").max(400) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);
  try {
    return NextResponse.json({ filters: await aiLeadFilters(body.data.text) });
  } catch (e) {
    if (e instanceof LlmUnavailableError || e instanceof z.ZodError || e instanceof SyntaxError) return fail("İstek şu an süzgeçlere çevrilemedi. Süzgeçleri elle seçebilirsiniz.", 503);
    return outreachFailure(e);
  }
}
