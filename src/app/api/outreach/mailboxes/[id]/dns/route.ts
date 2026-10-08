import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { checkDomain } from "@/modules/outreach/dns-lookup";
import { fail, guard, outreachFailure, rateLimiter } from "@/modules/outreach/http";
import { getMailbox, saveDnsCheck } from "@/modules/outreach/mailboxes";

export const maxDuration = 30;

const tooFast = rateLimiter(10);

/** Gönderici adresinin alan adını yeniden denetler (SPF, DKIM, DMARC, MX) ve sonucu kaydeder. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/outreach/mailboxes/[id]/dns">) {
  const g = await guard(req, { write: true });
  if ("response" in g) return g.response;
  if (tooFast(g.user.uid)) return fail("Çok hızlı denetliyorsunuz. Biraz bekleyin.", 429);

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail("Gönderici adresi bulunamadı.", 404);
  try {
    const mailbox = await getMailbox(g.user.uid, id);
    if (!mailbox) return fail("Gönderici adresi bulunamadı.", 404);
    const report = await checkDomain(mailbox.email.slice(mailbox.email.lastIndexOf("@") + 1), mailbox.provider);
    return NextResponse.json({ mailbox: await saveDnsCheck(g.user.uid, id, report) });
  } catch (e) {
    return outreachFailure(e);
  }
}
