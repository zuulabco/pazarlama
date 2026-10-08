import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { applyDiscovery, getContact } from "@/modules/outreach/contacts";
import { discoverEmails } from "@/modules/outreach/discover/find";
import { fail, guard, outreachFailure, rateLimiter } from "@/modules/outreach/http";

export const maxDuration = 60;

/** Dakikada en çok 40 tarama (toplu taramada istemci birkaç eşzamanlı istek gönderir). */
const tooFast = rateLimiter(40);

/**
 * Kişinin web sitesinden e-posta bulur ve kişiye yazar. Site yoksa ya da adres bulunamazsa nedeni kişiye not olarak düşer
 * (kullanıcı yeniden denemeye ya da elle yazmaya karar verir).
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/outreach/contacts/[id]/discover">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  if (tooFast(g.user.uid)) return fail("Çok hızlı tarıyorsunuz. Birkaç saniye bekleyip tekrar deneyin.", 429);

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Kişi bulunamadı.", 404);

  try {
    const contact = await getContact(g.user.uid, id);
    if (!contact) return fail("Kişi bulunamadı.", 404);

    if (!contact.website) {
      const updated = await applyDiscovery(g.user.uid, id, { best: null, note: "Web sitesi olmadığı için e-posta aranamadı." });
      return NextResponse.json({ contact: updated, found: false });
    }

    const result = await discoverEmails(contact.website);
    if (!result.ok) {
      const updated = await applyDiscovery(g.user.uid, id, { best: null, note: result.error });
      return NextResponse.json({ contact: updated, found: false });
    }
    const note = result.best
      ? `${result.pages} sayfa tarandı, ${result.candidates.length} adres bulundu.`
      : result.candidates.length > 0
        ? "Bulunan adreslerin hiçbiri geçerli görünmüyor."
        : `${result.pages} sayfa tarandı, sitede e-posta adresi yazılı değil.`;
    const updated = await applyDiscovery(g.user.uid, id, { best: result.best, note });
    return NextResponse.json({ contact: updated, found: Boolean(result.best), candidates: result.candidates.map((c) => ({ email: c.email, kind: c.kind, status: c.status })) });
  } catch (e) {
    return outreachFailure(e);
  }
}
