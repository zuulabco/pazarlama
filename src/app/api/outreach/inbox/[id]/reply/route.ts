import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, guard, outreachFailure, rateLimiter } from "@/modules/outreach/http";
import { ReplyError, sendReply } from "@/modules/outreach/unibox";

export const maxDuration = 60;

const tooFast = rateLimiter(15);
const bodySchema = z.object({ body: z.string().trim().min(1, "Yanıt boş.").max(10000, "Yanıt çok uzun.") });

/** Konuşmaya yanıt gönderir (otomasyonun gönderici adresinden, aynı konuşmada görünecek şekilde). */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/outreach/inbox/[id]/reply">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  if (tooFast(g.user.uid)) return fail("Çok hızlı yanıt gönderiyorsunuz. Biraz bekleyin.", 429);
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Konuşma bulunamadı.", 404);
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);
  try {
    return NextResponse.json({ message: await sendReply(g.user.uid, id, body.data.body) }, { status: 201 });
  } catch (e) {
    if (e instanceof ReplyError) return fail(e.message, e.status);
    return outreachFailure(e);
  }
}
