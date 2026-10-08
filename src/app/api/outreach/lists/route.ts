import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createList, listLists } from "@/modules/outreach/contacts";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";

export async function GET(req: NextRequest) {
  const g = await guard(req);
  if ("response" in g) return g.response;
  try {
    return NextResponse.json({ lists: await listLists(g.user.uid) });
  } catch (e) {
    return outreachFailure(e);
  }
}

const bodySchema = z.object({ name: z.string().trim().min(1, "Liste adı yazın.").max(80, "En fazla 80 karakter.") });

export async function POST(req: NextRequest) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);
  try {
    return NextResponse.json({ list: await createList(g.user.uid, body.data.name) }, { status: 201 });
  } catch (e) {
    return outreachFailure(e);
  }
}
