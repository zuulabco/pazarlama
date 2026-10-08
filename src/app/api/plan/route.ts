import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/auth/origin";
import { getSessionUser } from "@/lib/auth/session";
import { planFailure as failure } from "@/modules/plan/http";
import { createPlan, listPlan } from "@/modules/plan/repository";
import { planInputSchema } from "@/modules/plan/types";

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

const rangeSchema = z.object({ from: z.iso.datetime({ offset: true }), to: z.iso.datetime({ offset: true }) });
const maxRangeMs = 130 * 86_400_000;

/** Aralıktaki planları döndürür. Sorgu: ?from=ISO&to=ISO (en çok ~4 ay). */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return error("Oturumunuz sona erdi. Tekrar giriş yapın.", 401);

  const q = rangeSchema.safeParse({ from: req.nextUrl.searchParams.get("from"), to: req.nextUrl.searchParams.get("to") });
  if (!q.success) return error("Geçersiz tarih aralığı.", 400);
  const from = new Date(q.data.from);
  const to = new Date(q.data.to);
  if (to <= from || to.getTime() - from.getTime() > maxRangeMs) return error("Geçersiz tarih aralığı.", 400);

  try {
    return NextResponse.json({ items: await listPlan(user.uid, from, to) });
  } catch (e) {
    return failure(e);
  }
}

/** Yeni plan öğesi ekler. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return error("Geçersiz istek kaynağı.", 403);
  const user = await getSessionUser();
  if (!user) return error("Oturumunuz sona erdi. Tekrar giriş yapın.", 401);

  const body = planInputSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return error(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);

  try {
    return NextResponse.json({ item: await createPlan(user.uid, body.data) }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
