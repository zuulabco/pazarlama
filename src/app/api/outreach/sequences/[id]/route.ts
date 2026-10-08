import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";
import { sequenceUpdateSchema } from "@/modules/outreach/sequence-schema";
import { deleteSequence, getSequence, updateSequence } from "@/modules/outreach/sequences";

const idOk = (id: string) => z.uuid().safeParse(id).success;

export async function GET(req: NextRequest, ctx: RouteContext<"/api/outreach/sequences/[id]">) {
  const g = await guard(req);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!idOk(id)) return fail("Otomasyon bulunamadı.", 404);
  try {
    const sequence = await getSequence(g.user.uid, id);
    return sequence ? NextResponse.json({ sequence }) : fail("Otomasyon bulunamadı.", 404);
  } catch (e) {
    return outreachFailure(e);
  }
}

/** Otomasyonu kaydeder (ad, açıklama, gönderim saatleri, ayarlar, adımların tamamı). Yalnızca verilen alanlar değişir. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/outreach/sequences/[id]">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!idOk(id)) return fail("Otomasyon bulunamadı.", 404);

  const body = sequenceUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);
  try {
    const sequence = await updateSequence(g.user.uid, id, body.data);
    return sequence ? NextResponse.json({ sequence }) : fail("Otomasyon bulunamadı.", 404);
  } catch (e) {
    return outreachFailure(e);
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/outreach/sequences/[id]">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!idOk(id)) return fail("Otomasyon bulunamadı.", 404);
  try {
    await deleteSequence(g.user.uid, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return outreachFailure(e);
  }
}
