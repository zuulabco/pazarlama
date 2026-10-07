import "server-only";
import { getFavorite } from "@/modules/favorites/repository";
import { getLeadRaw } from "@/modules/leads/repository";
import { getProfile } from "@/modules/profile/repository";
import { deriveSignals, type WorkFirm, type WorkSender } from "./context";

const num = (v: unknown) => (typeof v === "number" ? v : null);

/** Takipteki bir firmanın "çalışma bağlamı": kayıtlı veriler, ham arama verisi ve kullanıcının notları. */
export async function loadWorkFirm(uid: string, favoriteId: string): Promise<WorkFirm | null> {
  const fav = await getFavorite(uid, favoriteId);
  if (!fav) return null;
  const raw = (await getLeadRaw(uid, fav.place_id)) ?? {};

  const imageCount = num(raw.imagesCount);
  const closed = Boolean(raw.permanentlyClosed || raw.temporarilyClosed);

  return {
    id: fav.id,
    name: fav.name,
    category: fav.category,
    district: fav.city,
    phone: fav.phone,
    email: fav.email,
    hasWebsite: Boolean(fav.website),
    closed,
    rating: fav.rating,
    reviews: fav.review_count,
    score: fav.lead_score ?? 0,
    digital: fav.digital_need ?? 0,
    reach: fav.reachability ?? 0,
    status: fav.status,
    signals: deriveSignals({ website: Boolean(fav.website), phone: Boolean(fav.phone), rating: fav.rating, reviews: fav.review_count, imageCount }),
    notes: fav.notes.map((n) => n.body),
  };
}

/** Taslağı yazan kullanıcının (işletmesinin) bilgileri. */
export async function loadSender(uid: string, name: string | null | undefined): Promise<WorkSender | null> {
  const p = await getProfile(uid);
  if (!p) return null;
  return {
    businessName: p.businessName,
    firstName: name?.split(" ")[0] ?? null,
    workType: p.workType,
    services: p.services,
    description: p.businessDescription ?? "",
  };
}
