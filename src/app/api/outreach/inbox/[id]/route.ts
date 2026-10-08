import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";
import { getThread, setLeadStatus, setUnread } from "@/modules/outreach/unibox";
import { leadStatusValues } from "@/modules/outreach/unibox-options";

const idOk = (id: string) => z.uuid().safeParse(id).success;

/** Konuşmanın tüm iletileri. Açılınca okundu işaretlenir. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/outreach/inbox/[id]">) {
  const g = await guard(req);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!idOk(id)) return fail("Konuşma bulunamadı.", 404);
  try {
    const thread = await getThread(g.user.uid, id);
    return thread ? NextResponse.json(thread) : fail("Konuşma bulunamadı.", 404);
  } catch (e) {
    return outreachFailure(e);
  }
}

const patchSchema = z.object({ status: z.enum(leadStatusValues).optional(), unread: z.boolean().optional() }).refine((v) => v.status !== undefined || v.unread !== undefined, { message: "Değişiklik yok." });

/** Durum etiketini değiştirir ya da konuşmayı okundu/okunmadı yapar. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/outreach/inbox/[id]">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!idOk(id)) return fail("Konuşma bulunamadı.", 404);
  const body = patchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);
  try {
    let found = true;
    if (body.data.status !== undefined) found = await setLeadStatus(g.user.uid, id, body.data.status);
    if (found && body.data.unread !== undefined) found = await setUnread(g.user.uid, id, body.data.unread);
    return found ? NextResponse.json({ ok: true }) : fail("Konuşma bulunamadı.", 404);
  } catch (e) {
    return outreachFailure(e);
  }
}
