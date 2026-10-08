import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fail, guard, outreachFailure } from "@/modules/outreach/http";
import { listConversations } from "@/modules/outreach/unibox";
import { leadStatusValues } from "@/modules/outreach/unibox-options";

const query = z.object({
  status: z.enum([...leadStatusValues, "hepsi"]).default("hepsi"),
  unread: z.enum(["1", "0"]).default("0"),
  campaign: z.uuid().optional(),
  mailbox: z.uuid().optional(),
  q: z.string().trim().max(80).optional(),
});

/** Gelen kutusu: konuşma listesi ve durum sayaçları. */
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if ("response" in g) return g.response;
  const q = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!q.success) return fail("Geçersiz istek.", 400);
  try {
    return NextResponse.json(await listConversations(g.user.uid, { status: q.data.status, unreadOnly: q.data.unread === "1", sequenceId: q.data.campaign, mailboxId: q.data.mailbox, q: q.data.q }));
  } catch (e) {
    return outreachFailure(e);
  }
}
