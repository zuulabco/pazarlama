import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { activationProblems } from "@/modules/outreach/activation";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";
import { listMailboxes } from "@/modules/outreach/mailboxes";
import { getSequence, setSequenceStatus } from "@/modules/outreach/sequences";

const bodySchema = z.object({ status: z.enum(["aktif", "duraklatildi", "taslak"]), ignoreDns: z.boolean().optional() });

/**
 * Kampanyayı başlatır/duraklatır. Başlatmadan önce eksikler denetlenir (etkin adım, dolu mesaj, bağlı posta kutusu, alan adı ayarları);
 * alan adı ayarları dışındaki eksikler aşılamaz. Alan adı uyarısı `ignoreDns: true` ile bilerek geçilebilir.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/outreach/sequences/[id]/status">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Kampanya bulunamadı.", 404);
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Geçersiz istek.", 400);

  try {
    const seq = await getSequence(g.user.uid, id);
    if (!seq) return fail("Kampanya bulunamadı.", 404);

    if (body.data.status === "aktif") {
      const problems = activationProblems(seq, await listMailboxes(g.user.uid)).filter((p) => !(p.overridable && body.data.ignoreDns));
      if (problems.length > 0) {
        return NextResponse.json({ error: problems[0].message, problems }, { status: 422 });
      }
    }
    const updated = await setSequenceStatus(g.user.uid, id, body.data.status, null);
    return updated ? NextResponse.json({ sequence: updated }) : fail("Kampanya bulunamadı.", 404);
  } catch (e) {
    return outreachFailure(e);
  }
}
