import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { deleteContacts, updateContact } from "@/modules/outreach/contacts";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";
import { contactPatchSchema } from "@/modules/outreach/schema";

/** Kişinin alanlarını kısmen günceller (e-posta elle yazılırsa "elle girildi" olur). */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/outreach/contacts/[id]">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Kişi bulunamadı.", 404);
  const body = contactPatchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);

  try {
    const contact = await updateContact(g.user.uid, id, body.data);
    return contact ? NextResponse.json({ contact }) : fail("Kişi bulunamadı.", 404);
  } catch (e) {
    return outreachFailure(e);
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/outreach/contacts/[id]">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Kişi bulunamadı.", 404);
  try {
    await deleteContacts(g.user.uid, [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return outreachFailure(e);
  }
}
