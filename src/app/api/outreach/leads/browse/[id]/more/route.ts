import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, guard, outreachFailure, rateLimiter } from "@/modules/outreach/http";
import { extendLeadBrowse } from "@/modules/outreach/lead-browse";
import { LeadSearchError } from "@/modules/outreach/lead-search";

export const maxDuration = 60;

const tooFast = rateLimiter(8);
const bodySchema = z.object({ count: z.number().int().min(5, "En az 5 kişi.").max(200, "Bir seferde en çok 200 kişi.") });

/** Hazır bir listeye daha fazla kişi ekler (zaten listelenenler hariç). Yanıt: { search }; ilerlemeyi aynı adresin GET'i bildirir. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/outreach/leads/browse/[id]/more">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  if (tooFast(g.user.uid)) return fail("Çok hızlı istek gönderiyorsunuz. Bir dakika bekleyin.", 429);
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Arama bulunamadı.", 404);
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);
  try {
    return NextResponse.json({ search: await extendLeadBrowse(g.user.uid, id, body.data.count) });
  } catch (e) {
    if (e instanceof LeadSearchError) return fail(e.message, e.status);
    return outreachFailure(e);
  }
}
