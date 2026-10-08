import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { listMemberIds } from "@/modules/outreach/contacts";
import { enrollContacts, listEnrollments, removeEnrollments, setEnrollmentsPaused } from "@/modules/outreach/enrollments";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";
import { getSequence } from "@/modules/outreach/sequences";

const idOk = (id: string) => z.uuid().safeParse(id).success;
const ids = z.object({ ids: z.array(z.uuid()).min(1).max(500) });

/** Otomasyondaki kişiler. Sorgu: ?status=hepsi|aktif|bitti|duraklatildi|hata&page= */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/outreach/sequences/[id]/contacts">) {
  const g = await guard(req);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!idOk(id)) return fail("Otomasyon bulunamadı.", 404);
  const q = z
    .object({ status: z.enum(["hepsi", "aktif", "bitti", "duraklatildi", "hata"]).default("hepsi"), page: z.coerce.number().int().min(1).max(1000).default(1) })
    .safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!q.success) return fail("Geçersiz istek.", 400);
  try {
    return NextResponse.json(await listEnrollments(g.user.uid, id, { status: q.data.status, page: q.data.page }));
  } catch (e) {
    return outreachFailure(e);
  }
}

const enrollSchema = z.object({ contactIds: z.array(z.uuid()).max(500).optional(), listId: z.uuid().optional() }).refine((v) => v.contactIds?.length || v.listId, { message: "Kişi ya da liste seçin." });

/**
 * Kişileri otomasyona ekler: seçili kişiler ve/veya bir listenin tüm kişileri. Uygun olmayanlar (e-postası yok/geçersiz,
 * kişisel adres, kara liste, zaten ekli) atlanır; nedenleri sayılarak döner.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/outreach/sequences/[id]/contacts">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!idOk(id)) return fail("Otomasyon bulunamadı.", 404);
  const body = enrollSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Geçersiz istek.", 400);

  try {
    const seq = await getSequence(g.user.uid, id);
    if (!seq) return fail("Otomasyon bulunamadı.", 404);
    const all = new Set(body.data.contactIds ?? []);
    if (body.data.listId) {
      for (const id of await listMemberIds(g.user.uid, body.data.listId)) all.add(id);
    }
    if (all.size === 0) return fail("Eklenecek kişi bulunamadı.", 400);
    return NextResponse.json(await enrollContacts(g.user.uid, seq, [...all].slice(0, 500)));
  } catch (e) {
    return outreachFailure(e);
  }
}

/** Kişileri otomasyondan çıkarır (kişi kaydı silinmez). */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/outreach/sequences/[id]/contacts">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!idOk(id)) return fail("Otomasyon bulunamadı.", 404);
  const body = ids.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Geçersiz istek.", 400);
  try {
    await removeEnrollments(g.user.uid, id, body.data.ids);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return outreachFailure(e);
  }
}

/** Seçili kişileri duraklatır ya da sürdürür. Gövde: { ids, paused } */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/outreach/sequences/[id]/contacts">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!idOk(id)) return fail("Otomasyon bulunamadı.", 404);
  const body = ids.extend({ paused: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Geçersiz istek.", 400);
  try {
    await setEnrollmentsPaused(g.user.uid, id, body.data.ids, body.data.paused);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return outreachFailure(e);
  }
}
