import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, outreachFailure, rateLimiter } from "@/modules/outreach/http";
import { leadSearchSchema } from "@/modules/outreach/lead-options";
import { LeadSearchError } from "@/modules/outreach/lead-search";
import { startLeadBrowse } from "@/modules/outreach/lead-browse";

export const maxDuration = 60;

const tooFast = rateLimiter(8);

/** Aramayı başlatır: kişileri listeler (kredi düşmez, günlük listeleme hakkından düşer). Yanıt: { search }. */
export async function POST(req: NextRequest) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  if (tooFast(g.user.uid)) return fail("Çok hızlı arama başlatıyorsunuz. Bir dakika bekleyin.", 429);

  const body = leadSearchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);

  try {
    return NextResponse.json({ search: await startLeadBrowse(g.user.uid, body.data) }, { status: 201 });
  } catch (e) {
    if (e instanceof LeadSearchError) return fail(e.message, e.status);
    return outreachFailure(e);
  }
}
