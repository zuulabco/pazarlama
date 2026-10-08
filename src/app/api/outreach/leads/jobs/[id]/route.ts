import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";
import { getLeadJob } from "@/modules/outreach/lead-search";

export const maxDuration = 60;

/** Aramanın durumu. Sağlayıcı koşusu bittiyse sonuçlar bu çağrıda aktarılır. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/outreach/leads/jobs/[id]">) {
  const g = await guard(req);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Arama bulunamadı.", 404);
  try {
    const job = await getLeadJob(g.user.uid, id);
    return job ? NextResponse.json({ job }) : fail("Arama bulunamadı.", 404);
  } catch (e) {
    return outreachFailure(e);
  }
}
