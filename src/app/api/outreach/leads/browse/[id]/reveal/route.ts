import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, guard, outreachFailure, rateLimiter } from "@/modules/outreach/http";
import { InsufficientCreditsError, revealLeads } from "@/modules/outreach/lead-browse";
import { LeadSearchError } from "@/modules/outreach/lead-search";

export const maxDuration = 60;

const tooFast = rateLimiter(10);
const bodySchema = z.object({ rids: z.array(z.number().int().min(0)).min(1, "Eklenecek kişi seçin.").max(200), listId: z.uuid().nullish() });

/** Seçilen satırları Kişiler'e ekler (e-posta açılır); kişi başına 1 kredi düşer. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/outreach/leads/browse/[id]/reveal">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  if (tooFast(g.user.uid)) return fail("Çok hızlı işlem yapıyorsunuz. Biraz bekleyin.", 429);
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Arama bulunamadı.", 404);
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);

  try {
    return NextResponse.json(await revealLeads(g.user.uid, id, body.data.rids, body.data.listId ?? null));
  } catch (e) {
    if (e instanceof InsufficientCreditsError) return NextResponse.json({ error: e.message, needed: e.needed, available: e.available }, { status: 402 });
    if (e instanceof LeadSearchError) return fail(e.message, e.status);
    return outreachFailure(e);
  }
}
