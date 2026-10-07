import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/auth/origin";
import { getSessionUser } from "@/lib/auth/session";
import { site } from "@/lib/site";
import { getProfile } from "@/modules/profile/repository";
import { startPlacesRun } from "@/modules/leads/apify";
import { searchLimits } from "@/modules/leads/config";
import { isLikelyBusinessType } from "@/modules/leads/jev";
import { canonicalDistrict, canonicalProvince, composeLocation } from "@/modules/leads/location";
import { countSearchesSince, createSearch, hasActiveSearch, updateSearch } from "@/modules/leads/repository";

const bodySchema = z.object({
  query: z.string().trim().min(2, "Lütfen geçerli bir firma türü girin.").max(60, "Firma türü en fazla 60 karakter olabilir."),
  province: z.string().trim().min(1, "Bir il seçin."),
  district: z.string().trim().optional(),
  maxResults: z
    .number("Firma sayısı bir sayı olmalı.")
    .int("Firma sayısı tam sayı olmalı.")
    .min(1, "En az 1 firma isteyin.")
    .max(searchLimits.maxResults, `En fazla ${searchLimits.maxResults} firma istenebilir.`),
  withoutWebsite: z.boolean().default(false),
});

type Field = "query" | "province" | "district" | "maxResults";
const error = (message: string, status: number, field?: Field) =>
  NextResponse.json({ error: message, field }, { status });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return error("Geçersiz istek kaynağı.", 403);

  const user = await getSessionUser();
  if (!user) return error("Oturumunuz sona erdi. Tekrar giriş yapın.", 401);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return error(issue?.message ?? "Eksik bilgi.", 400, issue?.path[0] as Field | undefined);
  }
  const { query, maxResults, withoutWebsite } = parsed.data;

  // İl ve ilçe, Türkiye'nin resmî listesinden doğrulanır.
  const province = canonicalProvince(parsed.data.province);
  if (!province) return error("Listeden bir il seçin.", 400, "province");
  let district: string | null = null;
  if (parsed.data.district) {
    district = canonicalDistrict(province, parsed.data.district);
    if (!district) return error(`${province} ilinde böyle bir ilçe bulunamadı.`, 400, "district");
  }

  // Birbirinden bağımsız kontroller aynı anda yapılır (yanıt süresini kısaltır).
  const now = Date.now();
  const [profile, active, today, validType] = await Promise.all([
    getProfile(user.uid),
    hasActiveSearch(user.uid, new Date(now - searchLimits.activeWindowMinutes * 60_000)),
    countSearchesSince(user.uid, new Date(now - 24 * 3_600_000)),
    isLikelyBusinessType(query),
  ]);

  if (!profile) return error("Önce hesap kurulumunu tamamlayın.", 409);
  // Harcamayı sınırlayan korumalar: eşzamanlı tek arama ve günlük üst sınır.
  if (active) return error("Devam eden bir aramanız var. Bitmesini bekleyin.", 409);
  if (today >= searchLimits.perDay) {
    return error(`Günlük arama sınırına ulaştınız (${searchLimits.perDay}). Yarın tekrar deneyin.`, 429);
  }
  // Saçma bir ifade Apify'a (ve bütçeye) gitmeden elenir.
  if (!validType) return error("Lütfen geçerli bir firma türü girin.", 422, "query");

  const location = composeLocation(province, district);
  const search = await createSearch(user.uid, { query, location, maxResults });

  try {
    // Webhook yalnızca herkese açık bir adres varsa kurulur; yerelde durum sorgusu işi ilerletir.
    const secret = process.env.APIFY_WEBHOOK_SECRET;
    const webhook = site.url.startsWith("https://") && secret ? { url: `${site.url}/api/webhooks/apify`, secret } : undefined;
    const run = await startPlacesRun({ query, location, maxResults, withoutWebsite, webhook });
    await updateSearch(search.id, { status: "scraping", apify_run_id: run.id, apify_dataset_id: run.datasetId });
  } catch (e) {
    console.error("Apify koşusu başlatılamadı:", e);
    await updateSearch(search.id, { status: "failed", error: "Arama başlatılamadı. Birkaç dakika sonra tekrar deneyin." });
    return error("Arama başlatılamadı. Birkaç dakika sonra tekrar deneyin.", 502);
  }

  return NextResponse.json({ id: search.id }, { status: 201 });
}
