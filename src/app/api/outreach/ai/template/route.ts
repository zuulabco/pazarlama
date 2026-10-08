import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { LlmUnavailableError } from "@/lib/llm/nvidia";
import { writeTemplate } from "@/modules/outreach/ai";
import { fail, guard, outreachFailure, rateLimiter } from "@/modules/outreach/http";
import { senderContextFor } from "@/modules/outreach/sender-context";

export const maxDuration = 60;

const tooFast = rateLimiter(10);

const bodySchema = z.object({
  settings: z.object({
    type: z.enum(["tanisma", "takip", "son"]),
    tone: z.enum(["samimi", "profesyonel", "net"]),
    length: z.enum(["kisa", "standart", "ayrintili"]),
    extra: z.string().max(500),
  }),
  mode: z.enum(["asistan", "istem"]),
  prompt: z.string().max(500).optional(),
  service: z.string().max(80).nullish(),
  previousSubject: z.string().max(150).optional(),
});

/** Adım için yapay zekâ şablonu yazar (asistanlı: seçeneklerle, istem: serbest istemle). Sonuç düzenlenebilir şablondur. */
export async function POST(req: NextRequest) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  if (tooFast(g.user.uid)) return fail("Çok hızlı yazdırıyorsunuz. Birkaç saniye bekleyin.", 429);
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Geçersiz istek.", 400);
  if (body.data.mode === "istem" && !body.data.prompt?.trim()) return fail("Ne yazılmasını istediğinizi kısaca anlatın.", 400);

  try {
    const sender = await senderContextFor(g.user.uid, g.user.name);
    if (!sender) return fail("Önce hesap kurulumunu tamamlayın.", 409);
    const t = await writeTemplate({ ...body.data, service: body.data.service ?? null, sender });
    return NextResponse.json(t);
  } catch (e) {
    if (e instanceof LlmUnavailableError || e instanceof z.ZodError || e instanceof SyntaxError) return fail("Şablon şu an yazılamadı. Biraz sonra tekrar deneyin.", 503);
    return outreachFailure(e);
  }
}
