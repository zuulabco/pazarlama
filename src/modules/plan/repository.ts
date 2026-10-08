import "server-only";
import { db } from "@/lib/supabase/server";
import { getFavorite } from "../favorites/repository";
import { maxSpanDays, type PlanInput, type PlanItem, type PlanKind } from "./types";

/** Plan tablosu henüz oluşturulmadıysa (0006 migration'ı çalıştırılmadıysa) fırlatılır. */
export class PlanUnavailableError extends Error {
  constructor() {
    super("Plan tablosu bulunamadı. supabase/migrations/0006_plan.sql çalıştırılmalı.");
  }
}

/** Kullanıcı başına en çok bu kadar plan öğesi (kötüye kullanıma karşı). */
export const maxPlanItems = 2000;

type Row = {
  id: string;
  kind: PlanKind;
  title: string;
  details: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  favorite_id: string | null;
  with_name: string | null;
  location: string | null;
  done: boolean;
};

const columns = "id, kind, title, details, starts_at, ends_at, all_day, favorite_id, with_name, location, done";

type DbError = { code?: string; message: string };

function check(what: string, error: DbError | null) {
  if (!error) return;
  // 42P01: tablo yok (Postgres). PGRST205: tablo şema önbelleğinde yok (PostgREST).
  if (error.code === "42P01" || error.code === "PGRST205") throw new PlanUnavailableError();
  throw new Error(`${what}: ${error.message}`);
}

const toItem = (r: Row): PlanItem => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  details: r.details,
  startsAt: new Date(r.starts_at).toISOString(),
  endsAt: r.ends_at ? new Date(r.ends_at).toISOString() : null,
  allDay: r.all_day,
  favoriteId: r.favorite_id,
  withName: r.with_name,
  location: r.location,
  done: r.done,
});

/** [from, to) aralığına değen planlar. Çok günlü öğeler için başlangıç sorgusu `maxSpanDays` geriden başlar. */
export async function listPlan(uid: string, from: Date, to: Date): Promise<PlanItem[]> {
  const lookBack = new Date(from.getTime() - maxSpanDays * 86_400_000);
  const { data, error } = await db()
    .from("plan_items")
    .select(columns)
    .eq("user_uid", uid)
    .gte("starts_at", lookBack.toISOString())
    .lt("starts_at", to.toISOString())
    .order("starts_at", { ascending: true })
    .limit(1000)
    .returns<Row[]>();
  check("Plan okunamadı", error);
  return (data ?? []).map(toItem).filter((i) => Date.parse(i.endsAt ?? i.startsAt) >= from.getTime() || Date.parse(i.startsAt) >= from.getTime());
}

/** Bağlı firma kullanıcıya ait değilse null döner; ad boşsa firmanın adı yazılır. */
async function resolveFavorite(uid: string, favoriteId: string | null, withName: string | null) {
  if (!favoriteId) return { favoriteId: null, withName };
  const fav = await getFavorite(uid, favoriteId);
  return fav ? { favoriteId: fav.id, withName: withName ?? fav.name } : { favoriteId: null, withName };
}

export async function createPlan(uid: string, input: PlanInput): Promise<PlanItem> {
  const count = await db().from("plan_items").select("id", { count: "exact", head: true }).eq("user_uid", uid);
  check("Plan sayılamadı", count.error);
  if ((count.count ?? 0) >= maxPlanItems) throw new Error(`En fazla ${maxPlanItems} plan öğesi ekleyebilirsiniz.`);

  const link = await resolveFavorite(uid, input.favoriteId, input.withName);
  const { data, error } = await db()
    .from("plan_items")
    .insert({
      user_uid: uid,
      kind: input.kind,
      title: input.title,
      details: input.details,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      all_day: input.allDay,
      favorite_id: link.favoriteId,
      with_name: link.withName,
      location: input.location,
      done: input.done,
    })
    .select(columns)
    .single<Row>();
  check("Plan eklenemedi", error);
  return toItem(data!);
}

/** Yalnızca verilen alanları günceller; öğe kullanıcıya ait değilse null döner. */
export async function updatePlan(uid: string, id: string, patch: Partial<PlanInput>): Promise<PlanItem | null> {
  const update: Record<string, unknown> = {};
  if (patch.kind !== undefined) update.kind = patch.kind;
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.details !== undefined) update.details = patch.details;
  if (patch.startsAt !== undefined) update.starts_at = patch.startsAt;
  if (patch.endsAt !== undefined) update.ends_at = patch.endsAt;
  if (patch.allDay !== undefined) update.all_day = patch.allDay;
  if (patch.location !== undefined) update.location = patch.location;
  if (patch.done !== undefined) update.done = patch.done;
  if (patch.favoriteId !== undefined || patch.withName !== undefined) {
    const link = await resolveFavorite(uid, patch.favoriteId ?? null, patch.withName ?? null);
    update.favorite_id = link.favoriteId;
    update.with_name = link.withName;
  }
  if (Object.keys(update).length === 0) return getPlan(uid, id);

  const { data, error } = await db().from("plan_items").update(update).eq("user_uid", uid).eq("id", id).select(columns).maybeSingle<Row>();
  check("Plan güncellenemedi", error);
  return data ? toItem(data) : null;
}

export async function getPlan(uid: string, id: string): Promise<PlanItem | null> {
  const { data, error } = await db().from("plan_items").select(columns).eq("user_uid", uid).eq("id", id).maybeSingle<Row>();
  check("Plan okunamadı", error);
  return data ? toItem(data) : null;
}

export async function deletePlan(uid: string, id: string) {
  const { error } = await db().from("plan_items").delete().eq("user_uid", uid).eq("id", id);
  check("Plan silinemedi", error);
}
