import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { chatText } from "@/lib/llm/nvidia";
import { assistantMessages, contextText, fallbackReply, toAnswer } from "@/modules/outreach/assistant-rules";
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
    const question = body.data.messages.at(-1)!.content;
    try {
      const text = await chatText(assistantMessages(body.data.messages, context), { maxTokens: 700, timeoutMs: 40_000, temperature: 0.3 });
      return NextResponse.json(toAnswer(text, question));
    } catch (e) {
      // Model geçici olarak yanıt vermiyorsa kullanıcıya hata değil, elimizdeki rakamların özeti gösterilir.
      console.error("Adspine AI yanıt veremedi:", e instanceof Error ? e.message : e);
      return NextResponse.json({ reply: fallbackReply(context), links: [{ path: "/panel/raporlar", label: "Raporlar" }] });
    }
  } catch (e) {
    return outreachFailure(e);
  }
}
