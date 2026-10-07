import { timingSafeEqual } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { advanceSearch } from "@/modules/leads/pipeline";
import { findSearchByRun } from "@/modules/leads/repository";

export const maxDuration = 300;

const payloadSchema = z.object({ resource: z.object({ id: z.string().min(1) }) });

function validSecret(given: string | null) {
  const expected = process.env.APIFY_WEBHOOK_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Apify, koşu bittiğinde çağırır. Yanıt hemen döner; işleme yanıttan sonra devam eder. */
export async function POST(req: NextRequest) {
  if (!validSecret(req.headers.get("x-webhook-secret"))) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const parsed = payloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz içerik." }, { status: 400 });

  const search = await findSearchByRun(parsed.data.resource.id);
  if (!search) return NextResponse.json({ ok: true }); // Bu uygulamaya ait olmayan koşu

  after(async () => {
    try {
      await advanceSearch(search.id);
    } catch (e) {
      console.error("Webhook işlemi başarısız:", e);
    }
  });
  return NextResponse.json({ ok: true });
}
