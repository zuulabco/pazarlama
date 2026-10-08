import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createContact, deleteContacts, listContacts } from "@/modules/outreach/contacts";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";
import { contactInputSchema } from "@/modules/outreach/schema";

const querySchema = z.object({
  q: z.string().max(80).optional(),
  status: z.enum(["hepsi", "yok", "bulundu", "elle", "riskli", "gecersiz"]).default("hepsi"),
  kind: z.enum(["hepsi", "is", "rol", "kisisel"]).default("hepsi"),
  list: z.uuid().optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});

/** Kişileri süzerek listeler. Sorgu: ?q=&status=&kind=&list=&page= */
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if ("response" in g) return g.response;

  const p = Object.fromEntries(req.nextUrl.searchParams);
  const q = querySchema.safeParse({ ...p, q: p.q || undefined, list: p.list || undefined });
  if (!q.success) return fail("Geçersiz istek.", 400);
  try {
    return NextResponse.json(await listContacts(g.user.uid, { search: q.data.q, status: q.data.status, kind: q.data.kind, listId: q.data.list, page: q.data.page }));
  } catch (e) {
    return outreachFailure(e);
  }
}

/** Tek kişi ekler. */
export async function POST(req: NextRequest) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;

  const body = contactInputSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);
  try {
    return NextResponse.json({ contact: await createContact(g.user.uid, body.data) }, { status: 201 });
  } catch (e) {
    return outreachFailure(e);
  }
}

/** Kişileri siler. Gövde: { ids: uuid[] } */
export async function DELETE(req: NextRequest) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;

  const body = z.object({ ids: z.array(z.uuid()).min(1).max(500) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Geçersiz istek.", 400);
  try {
    await deleteContacts(g.user.uid, body.data.ids);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return outreachFailure(e);
  }
}
