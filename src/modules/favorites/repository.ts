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
  created_at: string;
};

export type FavoriteNote = { id: string; body: string; created_at: string };
export type FavoriteWithNotes = Favorite & { notes: FavoriteNote[] };

/** Notlar tablosu henüz oluşturulmadıysa (0004 migration'ı çalıştırılmadıysa) fırlatılır. */
export class NotesUnavailableError extends Error {
  constructor() {
    super("Notlar tablosu bulunamadı. supabase/migrations/0004_favorite_notes.sql çalıştırılmalı.");
  }
}

export const maxNotesPerFavorite = 100;

const columns =
  "id, place_id, name, category, address, city, phone, website, maps_url, rating, review_count, lead_score, digital_need, reachability, priority, source, status, created_at";

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

export async function listFavorites(uid: string): Promise<FavoriteWithNotes[]> {
  const { data, error } = await db()
    .from("favorites")
    .select(columns)
    .eq("user_uid", uid)
    .order("created_at", { ascending: false })
    .returns<Favorite[]>();
  check("Favoriler okunamadı", error);
  const favorites = data ?? [];
  if (favorites.length === 0) return [];

  // Notlar ayrı tabloda; tablo henüz yoksa firmalar notsuz listelenir.
  const notes = await db()
    .from("favorite_notes")
    .select("id, favorite_id, body, created_at")
    .eq("user_uid", uid)
    .in("favorite_id", favorites.map((f) => f.id))
    .order("created_at", { ascending: false })
    .returns<(FavoriteNote & { favorite_id: string })[]>();
  const byFavorite = new Map<string, FavoriteNote[]>();
  if (!notes.error) {
    for (const n of notes.data ?? []) {
      const list = byFavorite.get(n.favorite_id) ?? [];
      list.push({ id: n.id, body: n.body, created_at: n.created_at });
      byFavorite.set(n.favorite_id, list);
    }
  } else if (notes.error.code !== "42P01" && notes.error.code !== "PGRST205") {
    throw new Error(`Notlar okunamadı: ${notes.error.message}`);
  }
  return favorites.map((f) => ({ ...f, notes: byFavorite.get(f.id) ?? [] }));
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

export async function updateFavorite(uid: string, id: string, patch: { status?: FollowStatus }) {
  const { data, error } = await db().from("favorites").update(patch).eq("id", id).eq("user_uid", uid).select("id");
  check("Favori güncellenemedi", error);
  return (data?.length ?? 0) > 0;
}

const isMissing = (e: DbError) => e.code === "42P01" || e.code === "PGRST205";

/** Takipteki firmaya yeni bir not ekler. Firma kullanıcıya ait değilse null döner. */
export async function addNote(uid: string, favoriteId: string, body: string): Promise<FavoriteNote | null> {
  const owner = await db().from("favorites").select("id").eq("id", favoriteId).eq("user_uid", uid).maybeSingle();
  check("Favori okunamadı", owner.error);
  if (!owner.data) return null;

  const count = await db().from("favorite_notes").select("id", { count: "exact", head: true }).eq("favorite_id", favoriteId);
  if (count.error) {
    if (isMissing(count.error)) throw new NotesUnavailableError();
    throw new Error(`Notlar okunamadı: ${count.error.message}`);
  }
  if ((count.count ?? 0) >= maxNotesPerFavorite) throw new Error(`Bir firmaya en fazla ${maxNotesPerFavorite} not eklenebilir.`);

  const { data, error } = await db()
    .from("favorite_notes")
    .insert({ user_uid: uid, favorite_id: favoriteId, body })
    .select("id, body, created_at")
    .single<FavoriteNote>();
  if (error) {
    if (isMissing(error)) throw new NotesUnavailableError();
    throw new Error(`Not eklenemedi: ${error.message}`);
  }
  return data;
}

export async function deleteNote(uid: string, favoriteId: string, noteId: string) {
  const { error } = await db().from("favorite_notes").delete().eq("id", noteId).eq("favorite_id", favoriteId).eq("user_uid", uid);
  if (error) {
    if (isMissing(error)) throw new NotesUnavailableError();
    throw new Error(`Not silinemedi: ${error.message}`);
  }
}
