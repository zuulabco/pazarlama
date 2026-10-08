import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/auth/origin";
import { getSessionUser } from "@/lib/auth/session";
import { planFailure } from "@/modules/plan/http";
import { deletePlan, getPlan, updatePlan } from "@/modules/plan/repository";
import { planPatchSchema } from "@/modules/plan/types";

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

/** Plan öğesini kısmen günceller (örn. yalnızca { done: true }). */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/plan/[id]">) {
  if (!isSameOrigin(req)) return error("Geçersiz istek kaynağı.", 403);
  const user = await getSessionUser();
  if (!user) return error("Oturumunuz sona erdi. Tekrar giriş yapın.", 401);

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return error("Plan bulunamadı.", 404);
  const body = planPatchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return error(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);

  try {
    // Yalnızca bir uç verilmişse, süre kuralı mevcut öğeyle birlikte denetlenir.
    if (body.data.startsAt !== undefined || body.data.endsAt !== undefined) {
      const current = await getPlan(user.uid, id);
      if (!current) return error("Plan bulunamadı.", 404);
      const start = Date.parse(body.data.startsAt ?? current.startsAt);
      const end = body.data.endsAt === undefined ? (current.endsAt ? Date.parse(current.endsAt) : null) : body.data.endsAt ? Date.parse(body.data.endsAt) : null;
      if (end !== null && (end < start || end - start > 14 * 86_400_000)) return error("Bitiş, başlangıçtan sonra olmalı (en çok 14 gün).", 400);
    }
    const item = await updatePlan(user.uid, id, body.data);
    return item ? NextResponse.json({ item }) : error("Plan bulunamadı.", 404);
  } catch (e) {
    return planFailure(e);
  }
}

/** Plan öğesini siler. */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/plan/[id]">) {
  if (!isSameOrigin(req)) return error("Geçersiz istek kaynağı.", 403);
  const user = await getSessionUser();
  if (!user) return error("Oturumunuz sona erdi. Tekrar giriş yapın.", 401);

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return error("Plan bulunamadı.", 404);

  try {
    await deletePlan(user.uid, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return planFailure(e);
  }
}
