import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { importContacts, importFavorites } from "@/modules/outreach/contacts";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";
import { contactInputSchema, importSchema } from "@/modules/outreach/schema";

const bodySchema = z.union([z.object({ source: z.literal("takip") }), importSchema.extend({ source: z.literal("csv") })]);

/**
 * Kişileri toplu ekler. Gövde: { source: "takip" } (takipteki tüm firmalar) ya da { source: "csv", rows } (en çok 500 satır).
 * CSV satırları tek tek doğrulanır; hatalı satırlar atlanır ve sayısı bildirilir.
 */
export async function POST(req: NextRequest) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);

  try {
    if (body.data.source === "takip") return NextResponse.json({ ...(await importFavorites(g.user.uid)), invalid: 0 });

    const valid = body.data.rows.flatMap((r) => {
      const parsed = contactInputSchema.safeParse(r);
      return parsed.success ? [parsed.data] : [];
    });
    const result = valid.length > 0 ? await importContacts(g.user.uid, valid, "csv") : { added: 0, skipped: 0 };
    return NextResponse.json({ ...result, invalid: body.data.rows.length - valid.length });
  } catch (e) {
    return outreachFailure(e);
  }
}
