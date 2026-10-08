import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { removeSuppression } from "@/modules/outreach/contacts";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";

/** Kara listeden çıkarır. */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/outreach/suppressions/[id]">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Kayıt bulunamadı.", 404);
  try {
    await removeSuppression(g.user.uid, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return outreachFailure(e);
  }
}
