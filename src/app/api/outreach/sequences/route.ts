import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { writeSequence } from "@/modules/outreach/ai";
import { fail, guard, outreachFailure, rateLimiter } from "@/modules/outreach/http";
import { senderContextFor } from "@/modules/outreach/sender-context";
import { sequenceCreateSchema } from "@/modules/outreach/sequence-schema";
import { createSequence, listSequences } from "@/modules/outreach/sequences";
import { starters } from "@/modules/outreach/starters";
import { LlmUnavailableError } from "@/lib/llm/nvidia";

export const maxDuration = 60;

const aiLimiter = rateLimiter(4);

export async function GET(req: NextRequest) {
  const g = await guard(req);
  if ("response" in g) return g.response;
  try {
    return NextResponse.json({ sequences: await listSequences(g.user.uid) });
  } catch (e) {
    return outreachFailure(e);
  }
}

const bodySchema = sequenceCreateSchema.extend({
  from: z
    .discriminatedUnion("kind", [
      z.object({ kind: z.literal("starter"), id: z.string().max(40) }),
      z.object({
        kind: z.literal("ai"),
        goal: z.string().trim().min(5, "Kampanyanın amacını yazın.").max(300),
        audience: z.string().trim().min(3, "Hedef kitleyi yazın.").max(300),
        steps: z.number().int().min(2).max(5).default(3),
        tone: z.enum(["samimi", "profesyonel", "net"]).default("samimi"),
      }),
    ])
    .optional(),
});

/** Kampanya oluşturur: boş, hazır şablondan ya da yapay zekâyla (hedef kitle + amaçtan 2-5 adımlı dizi). */
export async function POST(req: NextRequest) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);
  const { from, name, description } = body.data;

  try {
    let steps;
    if (from?.kind === "starter") {
      const starter = starters.find((s) => s.id === from.id);
      if (!starter) return fail("Şablon bulunamadı.", 404);
      steps = starter.steps;
    } else if (from?.kind === "ai") {
      if (aiLimiter(g.user.uid)) return fail("Çok hızlı kampanya üretiyorsunuz. Bir dakika bekleyin.", 429);
      const sender = await senderContextFor(g.user.uid, g.user.name);
      if (!sender) return fail("Önce hesap kurulumunu tamamlayın.", 409);
      try {
        steps = await writeSequence({ goal: from.goal, audience: from.audience, steps: from.steps, tone: from.tone, sender });
      } catch (e) {
        if (e instanceof LlmUnavailableError || e instanceof z.ZodError || e instanceof SyntaxError) return fail("Kampanya şu an yazılamadı. Biraz sonra tekrar deneyin ya da hazır şablondan başlayın.", 503);
        throw e;
      }
    }
    return NextResponse.json({ sequence: await createSequence(g.user.uid, { name, description, steps }) }, { status: 201 });
  } catch (e) {
    return outreachFailure(e);
  }
}
