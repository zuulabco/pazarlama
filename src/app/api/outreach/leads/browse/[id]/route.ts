import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";
import { getLeadBrowse } from "@/modules/outreach/lead-browse";

export const maxDuration = 60;

/** Aramanın durumu ve (hazırsa) gizlenmiş satırlar. Sorgu: ?skipOwned=1&oneLead=1 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/outreach/leads/browse/[id]">) {
  const g = await guard(req);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Arama bulunamadı.", 404);
  const q = req.nextUrl.searchParams;
  try {
    const search = await getLeadBrowse(g.user.uid, id, { skipOwned: q.get("skipOwned") === "1", oneLead: q.get("oneLead") === "1" });
    return search ? NextResponse.json({ search }) : fail("Arama bulunamadı.", 404);
  } catch (e) {
    return outreachFailure(e);
  }
}
