import "server-only";
import { db } from "@/lib/supabase/server";
import type { LeadRow } from "../leads/repository";
import type { FollowStatus } from "./status";

export type Favorite = {
  id: string;
  place_id: string;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  maps_url: string | null;
  rating: number | null;
  review_count: number | null;
  lead_score: number | null;
  digital_need: number | null;
  reachability: number | null;
  priority: number | null;
  source: string | null;
  status: FollowStatus;
  note: string;
  created_at: string;
};

const columns =
  "id, place_id, name, category, address, city, phone, website, maps_url, rating, review_count, lead_score, digital_need, reachability, priority, source, status, note, created_at";

/** Favoriler tablosu henüz oluşturulmadıysa (0003 migration'ı çalıştırılmadıysa) fırlatılır. */
export class FavoritesUnavailableError extends Error {
  constructor() {
    super("Favoriler tablosu bulunamadı. supabase/migrations/0003_favorites.sql çalıştırılmalı.");
  }
}

type DbError = { code?: string; message: string };

function check(what: string, error: DbError | null) {
  if (!error) return;
  // 42P01: tablo yok (Postgres). PGRST205: tablo şema önbelleğinde yok (PostgREST).
  if (error.code === "42P01" || error.code === "PGRST205") throw new FavoritesUnavailableError();
  throw new Error(`${what}: ${error.message}`);
}

export async function listFavorites(uid: string) {
  const { data, error } = await db()
    .from("favorites")
    .select(columns)
    .eq("user_uid", uid)
    .order("created_at", { ascending: false })
    .returns<Favorite[]>();
  check("Favoriler okunamadı", error);
  return data ?? [];
}

/** Verilen firmalardan hangileri kullanıcının takibinde? Tablo yoksa boş küme döner (liste yine çizilir). */
export async function favoritePlaceIds(uid: string, placeIds: string[]) {
  if (placeIds.length === 0) return new Set<string>();
  const { data, error } = await db()
    .from("favorites")
    .select("place_id")
    .eq("user_uid", uid)
    .in("place_id", placeIds)
    .returns<{ place_id: string }[]>();
  try {
    check("Favoriler okunamadı", error);
  } catch (e) {
    if (e instanceof FavoritesUnavailableError) return new Set<string>();
    throw e;
  }
  return new Set((data ?? []).map((r) => r.place_id));
}

/** Firmayı takibe alır (zaten takipteyse dokunmaz); skorlar o anki hâliyle kopyalanır. */
export async function addFavorite(uid: string, lead: LeadRow, source: string) {
  const { error } = await db()
    .from("favorites")
    .upsert(
      {
        user_uid: uid,
        place_id: lead.place_id,
        name: lead.name,
        category: lead.category,
        address: lead.address,
        city: lead.city,
        phone: lead.phone,
        website: lead.website,
        maps_url: lead.maps_url,
        rating: lead.rating,
        review_count: lead.review_count,
        lead_score: lead.lead_score,
        digital_need: lead.digital_need,
        reachability: lead.reachability,
        priority: lead.priority,
        source,
      },
      { onConflict: "user_uid,place_id", ignoreDuplicates: true },
    );
  check("Favori eklenemedi", error);
}

export async function removeFavorite(uid: string, placeId: string) {
  const { error } = await db().from("favorites").delete().eq("user_uid", uid).eq("place_id", placeId);
  check("Favori kaldırılamadı", error);
}

export async function updateFavorite(uid: string, id: string, patch: { status?: FollowStatus; note?: string }) {
  const { data, error } = await db().from("favorites").update(patch).eq("id", id).eq("user_uid", uid).select("id");
  check("Favori güncellenemedi", error);
  return (data?.length ?? 0) > 0;
}
