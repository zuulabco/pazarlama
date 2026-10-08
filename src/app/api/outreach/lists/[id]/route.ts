import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { deleteList } from "@/modules/outreach/contacts";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";

/** Listeyi siler (içindeki kişiler silinmez). */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/outreach/lists/[id]">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Liste bulunamadı.", 404);
  try {
    await deleteList(g.user.uid, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return outreachFailure(e);
  }
}
