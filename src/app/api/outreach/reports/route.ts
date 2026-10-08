import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";
import { loadReports } from "@/modules/outreach/reports";

/** Genel raporlar. Sorgu: ?days=7|30|90 */
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if ("response" in g) return g.response;
  const q = z.object({ days: z.coerce.number().refine((d) => [7, 30, 90].includes(d), "Geçersiz aralık.").default(30) }).safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!q.success) return fail("Geçersiz istek.", 400);
  try {
    return NextResponse.json(await loadReports(g.user.uid, q.data.days));
  } catch (e) {
    return outreachFailure(e);
  }
}
