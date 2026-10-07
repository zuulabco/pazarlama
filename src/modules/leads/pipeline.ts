import "server-only";
import { getProfile } from "../profile/repository";
import { getRun, isFinished, listPlaces, type Place } from "./apify";
import { scoreMany } from "./jev";
import {
  claimForScoring,
  countScored,
  getSearchInternal,
  listUnscored,
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

const failSearch = async (id: string, message: string) => {
  await updateSearch(id, { status: "failed", error: message });
  const s = await getSearchInternal(id);
  return s ? result(s) : { status: "failed" as const, total_found: 0, total_scored: 0, error: message };
};

/**
 * Aramayı bir adım ilerletir. Hem Apify webhook'u hem de arayüzün durum sorgusu bunu çağırır;
 * tekrar çağrılması güvenlidir (atomik devralma + yalnızca skorlanmamış firmalar işlenir).
 *
 *  scraping → Apify koşusu bitmişse firmaları alıp kaydeder, JEV ile skorlar, "done" yapar.
 */
export async function advanceSearch(searchId: string): Promise<ProcessResult | null> {
  const search = await getSearchInternal(searchId);
  if (!search) return null;
  if (search.status !== "scraping" && search.status !== "scoring") return result(search);
  if (!search.apify_run_id) return result(search);

  const run = await getRun(search.apify_run_id);
  if (!isFinished(run.status)) return result(search);

  if (run.status !== "SUCCEEDED") {
    return failSearch(searchId, "Firmalar toplanamadı. Birkaç dakika sonra tekrar deneyin.");
  }

  // Aynı anda yalnızca bir istek işler.
  if (!(await claimForScoring(searchId))) return result((await getSearchInternal(searchId)) ?? search);

  try {
    const profile = await getProfile(search.user_uid);
    if (!profile) return failSearch(searchId, "Profil bilgileriniz bulunamadı. Önce hesap kurulumunu tamamlayın.");

    const places = (await listPlaces(run.datasetId, search.max_results)).filter((p) => !p.closed);
    if (places.length === 0) {
      await updateSearch(searchId, { status: "done", total_found: 0, total_scored: 0, apify_dataset_id: run.datasetId });
      return result((await getSearchInternal(searchId)) ?? search);
    }

    await upsertLeads(searchId, search.user_uid, places);
    await updateSearch(searchId, { total_found: places.length, apify_dataset_id: run.datasetId });

    const pending = (await listUnscored(searchId)).map((row) => ({ row, place: placeFromRow(row) }));
    let scored = await countScored(searchId);
    let errors = 0;
    let lastError = "";

    await scoreMany(profile, pending, async ({ row, place }, jev) => {
      if (jev instanceof Error) {
        errors += 1;
        lastError = jev.message;
        return;
      }
      const final = finalizeScores(
        jev,
        { hasWebsite: Boolean(place.website), hasPhone: Boolean(place.phone), claimed: place.claimed, closed: place.closed },
        profile,
      );
      await saveScores(row.id, jev, final);
      scored += 1;
      await updateSearch(searchId, { total_scored: scored });
    });

    if (scored === 0 && errors > 0) {
      console.error("JEV skorlama başarısız:", lastError);
      return failSearch(searchId, "Firmalar puanlanamadı. Birkaç dakika sonra tekrar deneyin.");
    }
    await updateSearch(searchId, { status: "done", total_scored: scored, error: errors ? `${errors} firma puanlanamadı.` : null });
  } catch (e) {
    console.error("Arama işlenemedi:", e);
    return failSearch(searchId, "Arama tamamlanamadı. Birkaç dakika sonra tekrar deneyin.");
  }

  const final = await getSearchInternal(searchId);
  return final ? result(final) : null;
}
