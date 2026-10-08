import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { addToList, removeFromList } from "@/modules/outreach/contacts";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";

const bodySchema = z.object({ contactIds: z.array(z.uuid()).min(1).max(500) });

/** Kişileri listeye ekler. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/outreach/lists/[id]/members">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Liste bulunamadı.", 404);
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Geçersiz istek.", 400);
  try {
    return NextResponse.json({ added: await addToList(g.user.uid, id, body.data.contactIds) });
  } catch (e) {
    return outreachFailure(e);
  }
}

/** Kişileri listeden çıkarır (kişiler silinmez). */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/outreach/lists/[id]/members">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Liste bulunamadı.", 404);
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Geçersiz istek.", 400);
  try {
    await removeFromList(g.user.uid, id, body.data.contactIds);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return outreachFailure(e);
  }
}
