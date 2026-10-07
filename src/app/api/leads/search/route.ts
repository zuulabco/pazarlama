import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/auth/origin";
import { getSessionUser } from "@/lib/auth/session";
import { site } from "@/lib/site";
import { getProfile } from "@/modules/profile/repository";
import { startPlacesRun } from "@/modules/leads/apify";
import { searchLimits } from "@/modules/leads/config";
import { countSearchesSince, createSearch, hasActiveSearch, updateSearch } from "@/modules/leads/repository";

const bodySchema = z.object({
  query: z.string().trim().min(2, "Aradığınız firma türünü yazın.").max(80, "En fazla 80 karakter."),
  location: z.string().trim().min(2, "Bir şehir ya da ilçe yazın.").max(60, "En fazla 60 karakter."),
  maxResults: z.number().int().refine((n) => (searchLimits.resultOptions as readonly number[]).includes(n), "Geçersiz firma sayısı."),
});

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return error("Geçersiz istek kaynağı.", 403);

  const user = await getSessionUser();
  if (!user) return error("Oturumunuz sona erdi. Tekrar giriş yapın.", 401);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Eksik bilgi.", 400);
  const { query, location, maxResults } = parsed.data;

  if (!(await getProfile(user.uid))) return error("Önce hesap kurulumunu tamamlayın.", 409);

  // Harcamayı sınırlayan korumalar: eşzamanlı tek arama ve günlük üst sınır.
  const now = Date.now();
  if (await hasActiveSearch(user.uid, new Date(now - searchLimits.activeWindowMinutes * 60_000))) {
    return error("Devam eden bir aramanız var. Bitmesini bekleyin.", 409);
  }
  if ((await countSearchesSince(user.uid, new Date(now - 24 * 3_600_000))) >= searchLimits.perDay) {
    return error(`Günlük arama sınırına ulaştınız (${searchLimits.perDay}). Yarın tekrar deneyin.`, 429);
  }

  const search = await createSearch(user.uid, { query, location, maxResults });

  try {
    // Webhook yalnızca herkese açık bir adres varsa kurulur; yerelde durum sorgusu işi ilerletir.
    const secret = process.env.APIFY_WEBHOOK_SECRET;
    const webhook = site.url.startsWith("https://") && secret ? { url: `${site.url}/api/webhooks/apify`, secret } : undefined;
    const run = await startPlacesRun({ query, location, maxResults, webhook });
    await updateSearch(search.id, { status: "scraping", apify_run_id: run.id, apify_dataset_id: run.datasetId });
  } catch (e) {
    console.error("Apify koşusu başlatılamadı:", e);
    await updateSearch(search.id, { status: "failed", error: "Arama başlatılamadı. Birkaç dakika sonra tekrar deneyin." });
    return error("Arama başlatılamadı. Birkaç dakika sonra tekrar deneyin.", 502);
  }

  return NextResponse.json({ id: search.id }, { status: 201 });
}
