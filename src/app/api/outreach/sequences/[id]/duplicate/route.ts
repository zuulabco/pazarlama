import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";
import { duplicateSequence } from "@/modules/outreach/sequences";

/** Otomasyonu adımlarıyla birlikte taslak olarak çoğaltır (kişiler ve günlük kopyalanmaz). */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/outreach/sequences/[id]/duplicate">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Otomasyon bulunamadı.", 404);
  try {
    const copy = await duplicateSequence(g.user.uid, id);
    return copy ? NextResponse.json({ sequence: copy }, { status: 201 }) : fail("Otomasyon bulunamadı.", 404);
  } catch (e) {
    return outreachFailure(e);
  }
}
