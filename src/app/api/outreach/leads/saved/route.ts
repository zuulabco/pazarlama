import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";
import { leadSearchSchema } from "@/modules/outreach/lead-options";
import { LeadSearchError } from "@/modules/outreach/lead-search";
import { listSavedSearches, saveSearch } from "@/modules/outreach/lead-browse";

export async function GET(req: NextRequest) {
  const g = await guard(req);
  if ("response" in g) return g.response;
  try {
    return NextResponse.json({ searches: await listSavedSearches(g.user.uid) });
  } catch (e) {
    return outreachFailure(e);
  }
}

const bodySchema = z.object({ name: z.string().trim().min(1, "Aramaya bir ad verin.").max(80, "En fazla 80 karakter."), query: leadSearchSchema });

/** Süzgeçleri adıyla kaydeder (sonuçlar saklanmaz). */
export async function POST(req: NextRequest) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);
  try {
    return NextResponse.json({ search: await saveSearch(g.user.uid, body.data.name, body.data.query) }, { status: 201 });
  } catch (e) {
    if (e instanceof LeadSearchError) return fail(e.message, e.status);
    return outreachFailure(e);
  }
}
