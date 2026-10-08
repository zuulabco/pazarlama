import { NextResponse, type NextRequest } from "next/server";
import { guard, outreachFailure } from "@/modules/outreach/http";
import { accountSummary } from "@/modules/outreach/usage";

/** Paket, kalan kredi ve kullanım. */
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if ("response" in g) return g.response;
  try {
    return NextResponse.json({ account: await accountSummary(g.user.uid) });
  } catch (e) {
    return outreachFailure(e);
  }
}
