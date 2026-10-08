import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { cleanEmail, isPlausibleEmail } from "@/modules/outreach/discover/emails";
import { addSuppression, listSuppressions } from "@/modules/outreach/contacts";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";

export async function GET(req: NextRequest) {
  const g = await guard(req);
  if ("response" in g) return g.response;
  try {
    return NextResponse.json({ suppressions: await listSuppressions(g.user.uid) });
  } catch (e) {
    return outreachFailure(e);
  }
}

const bodySchema = z.object({ value: z.string().trim().min(3, "Bir e-posta ya da alan adı yazın.").max(254) });
const domainPattern = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

/** Kara listeye bir e-posta ("ali@firma.com") ya da alan adı ("firma.com") ekler: bir daha o adrese hiçbir kampanya göndermez. */
export async function POST(req: NextRequest) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);

  const value = body.data.value.toLowerCase().replace(/^@/, "");
  try {
    if (value.includes("@")) {
      const email = cleanEmail(value);
      if (!isPlausibleEmail(email)) return fail("Geçerli bir e-posta adresi yazın.", 400);
      await addSuppression(g.user.uid, { email, reason: "elle" });
    } else {
      if (!domainPattern.test(value)) return fail("Geçerli bir alan adı yazın (örn. firma.com).", 400);
      await addSuppression(g.user.uid, { domain: value, reason: "elle" });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return outreachFailure(e);
  }
}
