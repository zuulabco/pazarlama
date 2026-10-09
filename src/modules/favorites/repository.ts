/**
 * Kayıtlı (eski) firmalar. Google Haritalar araması kaldırıldığı için yeni firma eklenemez; mevcut kayıtlar yalnızca Takvim'de
 * bir göreve bağlanabilsin diye okunur.
 */
import "server-only";
import { db } from "@/lib/supabase/server";
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
  /** Kullanıcının eklediği e-posta (0005 migration'ından sonra). */
  email: string | null;
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

const columns = "*"; // e-posta sütunu 0005 ile gelir; "*" sütun yokken de çalışır

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
  const favorites = (data ?? []).map((f) => ({ ...f, email: f.email ?? null }));
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

/** Tek bir takipteki firma (notlarıyla). Kullanıcıya ait değilse null. */
export async function getFavorite(uid: string, id: string): Promise<FavoriteWithNotes | null> {
  const { data, error } = await db().from("favorites").select(columns).eq("id", id).eq("user_uid", uid).maybeSingle<Favorite>();
  check("Favori okunamadı", error);
  if (!data) return null;
  data.email = data.email ?? null;

  const notes = await db()
    .from("favorite_notes")
    .select("id, body, created_at")
    .eq("favorite_id", id)
    .eq("user_uid", uid)
    .order("created_at", { ascending: false })
    .returns<FavoriteNote[]>();
  if (notes.error && notes.error.code !== "42P01" && notes.error.code !== "PGRST205") throw new Error(`Notlar okunamadı: ${notes.error.message}`);
  return { ...data, notes: notes.error ? [] : (notes.data ?? []) };
}
