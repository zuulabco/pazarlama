import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { chatJson, LlmUnavailableError } from "@/lib/llm/nvidia";
import { assistantMessages, contextText, toAnswer } from "@/modules/outreach/assistant-rules";
import { fail, guard, outreachFailure, rateLimiter } from "@/modules/outreach/http";
import { loadReports } from "@/modules/outreach/reports";
import { accountSummary } from "@/modules/outreach/usage";

export const maxDuration = 60;

const tooFast = rateLimiter(12);

const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(1000) })).min(1).max(20),
});

/** Yardımcı sohbeti: kullanıcının son 30 günlük rakamlarına dayanarak kısa, somut yanıt verir. */
export async function POST(req: NextRequest) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  if (tooFast(g.user.uid)) return fail("Çok hızlı soruyorsunuz. Birkaç saniye bekleyin.", 429);
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success || body.data.messages.at(-1)?.role !== "user") return fail("Geçersiz istek.", 400);

  try {
    const [reports, account] = await Promise.all([loadReports(g.user.uid, 30), accountSummary(g.user.uid)]);
    const context = contextText(reports, { planName: account.plan.label, credits: account.credits, senders: account.senders, campaigns: account.campaigns }, 30);
    const raw = await chatJson(assistantMessages(body.data.messages, context), { maxTokens: 1200, timeoutMs: 45_000, thinking: false, temperature: 0.3 });
    return NextResponse.json(toAnswer(raw));
  } catch (e) {
    if (e instanceof LlmUnavailableError || e instanceof ZodError || e instanceof SyntaxError) return fail("Yardımcı şu an yanıt veremedi. Biraz sonra tekrar deneyin.", 503);
    return outreachFailure(e);
  }
}
