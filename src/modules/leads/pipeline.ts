import "server-only";
import { getProfile, type Profile } from "../profile/repository";
import { getDatasetItemCount, getRun, isFinished, listPlaces, type Place } from "./apify";
import { scoreMany } from "./jev";
import {
  claimBatch,
  countScored,
  getSearchInternal,
  isActive,
  listPlaceIds,
  listUnscored,
  releaseBatch,
  saveScores,
  updateSearch,
  upsertLeads,
  type LeadRow,
  type Search,
} from "./repository";
import { finalizeScores } from "./scoring";

/** Veritabanı satırından JEV'in beklediği firma biçimini kurar. */
function placeFromRow(row: LeadRow): Place {
  const raw = row.raw as {
    categories?: string[];
    imagesCount?: number | null;
    claimThisBusiness?: boolean | null;
    permanentlyClosed?: boolean | null;
    temporarilyClosed?: boolean | null;
  };
  return {
    placeId: row.place_id,
    name: row.name,
    category: row.category,
    categories: raw.categories ?? [],
    address: row.address,
    city: row.city,
    district: row.city,
    phone: row.phone,
    website: row.website,
    mapsUrl: row.maps_url,
    rating: row.rating,
    reviewCount: row.review_count,
    claimed: raw.claimThisBusiness == null ? null : raw.claimThisBusiness === false,
    imageCount: raw.imagesCount ?? null,
    closed: Boolean(raw.permanentlyClosed || raw.temporarilyClosed),
    raw: row.raw,
  };
}

export type ProcessResult = Pick<Search, "status" | "total_found" | "total_scored" | "error">;

const result = (s: Search): ProcessResult => ({
  status: s.status,
  total_found: s.total_found,
  total_scored: s.total_scored,
  error: s.error,
});

const snapshot = async (id: string, fallback: Search) => result((await getSearchInternal(id)) ?? fallback);

async function failSearch(search: Search, message: string) {
  await updateSearch(search.id, { status: "failed", error: message });
  return snapshot(search.id, { ...search, status: "failed", error: message });
}

/**
 * Bir "parti": Apify veri kümesinde o ana kadar biriken firmaları kaydeder ve henüz puanlanmamış olanları
 * JEV ile puanlar. Koşu sürerken de çalışır; böylece toplama ve puanlama üst üste biner, sonuçlar
 * toplama bitmeden listeye düşmeye başlar.
 */
async function processBatch(search: Search, datasetId: string, profileRequest: Promise<Profile | null>) {
  // Bağımsız okumalar paralel yapılır.
  const [allPlaces, known] = await Promise.all([listPlaces(datasetId, search.max_results), listPlaceIds(search.id)]);
  const places = allPlaces.filter((p) => !p.closed);
  const fresh = places.filter((p) => !known.has(p.placeId));
  await upsertLeads(search.id, search.user_uid, fresh);
  await updateSearch(search.id, { total_found: known.size + fresh.length, apify_dataset_id: datasetId });

  const pending = (await listUnscored(search.id)).map((row) => ({ row, place: placeFromRow(row) }));
  let scored = await countScored(search.id);
  let errors = 0;
  let lastError = "";

  // Profil yalnızca puanlanacak firma varsa gerekir.
  const profile = pending.length > 0 ? await profileRequest : null;
  if (pending.length > 0 && !profile) throw new Error("Profil bulunamadı");

  await scoreMany(profile!, pending, async ({ row, place }, jev) => {
    if (jev instanceof Error) {
      errors += 1;
      lastError = jev.message;
      return;
    }
    const final = finalizeScores(
      jev,
      { hasWebsite: Boolean(place.website), hasPhone: Boolean(place.phone), claimed: place.claimed, closed: place.closed },
      profile!,
    );
    await saveScores(row.id, jev, final);
    scored += 1;
    await updateSearch(search.id, { total_scored: scored });
  });

  if (errors > 0) console.error(`JEV: ${errors} firma puanlanamadı:`, lastError);
  return { scored, errors, found: known.size + fresh.length };
}

/**
 * Aramayı bir adım ilerletir. Hem arayüzün durum sorgusu hem de Apify webhook'u çağırır; tekrar
 * çağrılması güvenlidir (kısa süreli kira + yalnızca puanlanmamış firmalar işlenir).
 */
export async function advanceSearch(searchId: string): Promise<ProcessResult | null> {
  for (let round = 0; round < 3; round++) {
    const search = await getSearchInternal(searchId);
    if (!search) return null;
    if (!isActive(search.status) || !search.apify_run_id) return result(search);

    // Koşu durumu ve veri kümesindeki kayıt sayısı birlikte (paralel) sorulur.
    const [run, itemCount] = await Promise.all([
      getRun(search.apify_run_id),
      search.apify_dataset_id ? getDatasetItemCount(search.apify_dataset_id) : Promise.resolve(0),
    ]);
    const finished = isFinished(run.status);

    // Boşta sorgu: yeni firma yok ve bilinenlerin hepsi puanlanmış. Kira almadan, hızlıca döner.
    if (!finished && itemCount <= search.total_found && search.total_scored >= search.total_found) {
      return result(search);
    }

    if (finished && run.status !== "SUCCEEDED") {
      // Koşu yarıda kaldıysa, o ana kadar puanlananlar korunur.
      const kept = await countScored(searchId);
      if (kept > 0) {
        await updateSearch(searchId, { status: "done", total_scored: kept, error: `Arama yarıda kaldı; ${kept} firma getirilebildi.` });
        return snapshot(searchId, search);
      }
      return failSearch(search, "Firmalar toplanamadı. Birkaç dakika sonra tekrar deneyin.");
    }

    if (!(await claimBatch(searchId))) return snapshot(searchId, search);

    try {
      const batch = await processBatch(search, run.datasetId, getProfile(search.user_uid));

      // İstenen sayıya ulaşıldı ve hepsi puanlandı: Apify koşuyu kapatmayı bekletse de arama biter.
      if (!finished && batch.found >= search.max_results && batch.scored >= batch.found) {
        await updateSearch(searchId, { status: "done", total_scored: batch.scored, error: batch.errors ? `${batch.errors} firma puanlanamadı.` : null });
        return snapshot(searchId, search);
      }

      if (finished) {
        const total = await countScored(searchId);
        if (total === 0 && batch.errors > 0) {
          return failSearch(search, "Firmalar puanlanamadı. Birkaç dakika sonra tekrar deneyin.");
        }
        await updateSearch(searchId, {
          status: "done",
          total_scored: total,
          error: batch.errors ? `${batch.errors} firma puanlanamadı.` : null,
        });
        return snapshot(searchId, search);
      }

      await releaseBatch(searchId);
      // Parti sürerken koşu bitmiş olabilir: bir tur daha çalış.
      if (!isFinished((await getRun(search.apify_run_id)).status)) return snapshot(searchId, search);
    } catch (e) {
      console.error("Arama işlenemedi:", e);
      if (e instanceof Error && e.message === "Profil bulunamadı") {
        return failSearch(search, "Profil bilgileriniz bulunamadı. Önce hesap kurulumunu tamamlayın.");
      }
      if (finished) return failSearch(search, "Arama tamamlanamadı. Birkaç dakika sonra tekrar deneyin.");
      await releaseBatch(searchId); // koşu sürüyor: sonraki sorgu yeniden dener
      return snapshot(searchId, search);
    }
  }
  return snapshot(searchId, (await getSearchInternal(searchId)) as Search);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Webhook için: arama tamamlanana (ya da süre dolana) kadar adım adım ilerletir. */
export async function advanceUntilSettled(searchId: string, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await advanceSearch(searchId);
    if (!state || state.status === "done" || state.status === "failed") return state;
    await sleep(2000);
  }
  return null;
}
