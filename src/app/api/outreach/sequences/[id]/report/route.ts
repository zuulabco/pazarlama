import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";
import { loadActivity, loadReport } from "@/modules/outreach/report-data";
import { getSequence } from "@/modules/outreach/sequences";

/** Otomasyon raporu (toplamlar, adım/varyant kırılımı, sağlık bandı) ve son etkinlikler. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/outreach/sequences/[id]/report">) {
  const g = await guard(req);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Otomasyon bulunamadı.", 404);
  try {
    const seq = await getSequence(g.user.uid, id);
    if (!seq) return fail("Otomasyon bulunamadı.", 404);
    const [report, activity] = await Promise.all([loadReport(g.user.uid, seq), loadActivity(g.user.uid, id)]);
    return NextResponse.json({ report, activity });
  } catch (e) {
    return outreachFailure(e);
  }
}
