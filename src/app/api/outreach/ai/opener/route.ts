import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { LlmUnavailableError } from "@/lib/llm/nvidia";
import { writeOpener } from "@/modules/outreach/ai";
import { getContact } from "@/modules/outreach/contacts";
import { fail, guard, outreachFailure, rateLimiter } from "@/modules/outreach/http";
import { senderContextFor } from "@/modules/outreach/sender-context";

export const maxDuration = 60;

const tooFast = rateLimiter(10);

/** Bir kişi için, sitesinden okunanlara dayanan kişisel açılış cümlesini önizler (kampanya önizlemesinde "Açılışı göster"). */
export async function POST(req: NextRequest) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  if (tooFast(g.user.uid)) return fail("Çok hızlı önizliyorsunuz. Birkaç saniye bekleyin.", 429);
  const body = z.object({ contactId: z.uuid() }).safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Geçersiz istek.", 400);

  try {
    const contact = await getContact(g.user.uid, body.data.contactId);
    if (!contact) return fail("Kişi bulunamadı.", 404);
    const sender = await senderContextFor(g.user.uid, g.user.name);
    if (!sender) return fail("Önce hesap kurulumunu tamamlayın.", 409);
    const opener = await writeOpener({ company: contact.company, city: contact.city, website: contact.website, sender }).catch((e) => {
      if (e instanceof LlmUnavailableError || e instanceof z.ZodError || e instanceof SyntaxError) return null;
      throw e;
    });
    return NextResponse.json({ opener });
  } catch (e) {
    return outreachFailure(e);
  }
}
