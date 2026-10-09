import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, guard, outreachFailure, rateLimiter } from "@/modules/outreach/http";
import { getMailbox } from "@/modules/outreach/mailboxes";
import { sendWarmupNow, warmupStats } from "@/modules/outreach/warmup";

export const maxDuration = 60;

const tooFast = rateLimiter(6);

/** Isındırma özeti: gün sayısı, günlük kota, son 14 günün sonuçları, skor ve çalışma durumu (havuzdaki eş sayısı, gönderim saati). */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/outreach/mailboxes/[id]/warmup">) {
  const g = await guard(req);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Gönderici adresi bulunamadı.", 404);
  try {
    const mailbox = await getMailbox(g.user.uid, id);
    if (!mailbox) return fail("Gönderici adresi bulunamadı.", 404);
    return NextResponse.json({ stats: await warmupStats(id, mailbox.warmupStartedAt) });
  } catch (e) {
    return outreachFailure(e);
  }
}

/** Bir ısındırma e-postasını hemen gönderir (saat penceresine bakmaz, günlük kotayı aşmaz). Sorun varsa nedenini söyler. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/outreach/mailboxes/[id]/warmup">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  if (tooFast(g.user.uid)) return fail("Çok hızlı istek gönderiyorsunuz. Biraz bekleyin.", 429);
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Gönderici adresi bulunamadı.", 404);
  try {
    const mailbox = await getMailbox(g.user.uid, id);
    if (!mailbox) return fail("Gönderici adresi bulunamadı.", 404);
    const first = await sendWarmupNow(g.user.uid, id);
    return NextResponse.json({ first, stats: await warmupStats(id, mailbox.warmupStartedAt) });
  } catch (e) {
    return outreachFailure(e);
  }
}
