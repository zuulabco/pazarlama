import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";
import { getMailbox } from "@/modules/outreach/mailboxes";
import { warmupStats } from "@/modules/outreach/warmup";

/** Isındırma özeti: gün sayısı, günlük kota, son 14 günün sonuçları ve skor. */
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
