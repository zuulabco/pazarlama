import "server-only";
import { db } from "@/lib/supabase/server";
import { addEvent } from "./enrollments";
import { bounceRate, guardDefaults, pauseMessage, shouldPause } from "./bounce-guard";

/** Etkin kampanyaların son 7 günlük geri dönme oranına bakar; eşiği aşanları otomatik duraklatır. Duraklatılan kampanya sayısını döndürür. */
export async function runBounceGuard(): Promise<number> {
  const { data: seqs } = await db().from("outreach_sequences").select("id, user_uid").eq("status", "aktif").returns<{ id: string; user_uid: string }[]>();
  if (!seqs?.length) return 0;
  const since = new Date(Date.now() - guardDefaults.windowDays * 86_400_000).toISOString();
  const { data: msgs } = await db()
    .from("outreach_messages")
    .select("sequence_id, status")
    .in("sequence_id", seqs.map((s) => s.id))
    .gte("sent_at", since)
    .limit(100_000)
    .returns<{ sequence_id: string; status: string }[]>();

  let paused = 0;
  for (const s of seqs) {
    const mine = (msgs ?? []).filter((m) => m.sequence_id === s.id && m.status !== "hata");
    const bounced = mine.filter((m) => m.status === "bounce").length;
    if (!shouldPause(mine.length, bounced)) continue;
    const reason = pauseMessage(bounceRate(mine.length, bounced));
    const { error } = await db().from("outreach_sequences").update({ status: "duraklatildi", paused_reason: reason }).eq("id", s.id).eq("status", "aktif");
    if (!error) {
      paused++;
      await addEvent({ uid: s.user_uid, kind: "hata", sequenceId: s.id, meta: { reason: "bounce_guard", sent: mine.length, bounced } });
    }
  }
  return paused;
}
