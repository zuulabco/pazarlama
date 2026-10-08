import { NextResponse, type NextRequest } from "next/server";
import { InsufficientCreditsError } from "@/modules/outreach/account";
import { fail, guard, outreachFailure, rateLimiter } from "@/modules/outreach/http";
import { leadSearchSchema } from "@/modules/outreach/lead-options";
import { LeadSearchError, startLeadSearch } from "@/modules/outreach/lead-search";

export const maxDuration = 60;

const tooFast = rateLimiter(6);

/**
 * "Kişi bul" aramasını başlatır. Krediler hemen ayrılır; sonuçlar bitince Kişiler'e eklenir, kullanılmayan kredi iade edilir.
 * Yanıt: { job } — durumu `GET /api/outreach/leads/jobs/[id]` ile takip edilir.
 */
export async function POST(req: NextRequest) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  if (tooFast(g.user.uid)) return fail("Çok hızlı arama başlatıyorsunuz. Bir dakika bekleyin.", 429);

  const body = leadSearchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);

  try {
    return NextResponse.json({ job: await startLeadSearch(g.user.uid, body.data) }, { status: 201 });
  } catch (e) {
    if (e instanceof InsufficientCreditsError) return NextResponse.json({ error: e.message, needed: e.needed, available: e.available }, { status: 402 });
    if (e instanceof LeadSearchError) return fail(e.message, e.status);
    return outreachFailure(e);
  }
}
