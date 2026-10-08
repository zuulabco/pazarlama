import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";
import { deleteSavedSearch } from "@/modules/outreach/lead-browse";

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/outreach/leads/saved/[id]">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Arama bulunamadı.", 404);
  try {
    await deleteSavedSearch(g.user.uid, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return outreachFailure(e);
  }
}
