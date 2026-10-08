/**
 * Genel raporlar (saf toplama): seçilen gün aralığında gönderim, yanıt, geri dönen, olumlu yanıt ve toplantı sayıları;
 * günlük seri; kampanya ve gönderici adresi kırılımı. Saat dilimi İstanbul'dur.
 */

export type RMsg = { sent_at: string; status: string; replied_at: string | null; sequence_id: string | null; mailbox_id: string | null };
export type REnroll = { sequence_id: string; mailbox_id: string | null; lead_status: string; last_reply_at: string | null };

export const POSITIVE = ["ilgili", "toplanti", "toplanti_yapildi", "kazanildi"] as const;
export const MEETING = ["toplanti", "toplanti_yapildi", "kazanildi"] as const;

export type Totals = { sent: number; replied: number; bounced: number; positive: number; meetings: number; unsubscribed: number };
export type Day = { date: string; sent: number; replied: number; bounced: number };
export type Overview = { days: number; totals: Totals; rates: { reply: number; bounce: number; positive: number }; daily: Day[] };
export type GroupRow = { id: string; sent: number; replied: number; bounced: number; positive: number; meetings: number };

const DAY = 86_400_000;
const TZ = "Europe/Istanbul";
export const dayKey = (t: number | string) => new Date(t).toLocaleDateString("sv-SE", { timeZone: TZ });

const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

function inRange(iso: string | null, since: number) {
  return iso !== null && Date.parse(iso) >= since;
}

/** Aralıktaki son `days` gün (bugün dahil) için özet. */
export function buildOverview(msgs: RMsg[], enrolls: REnroll[], unsubscribed: number, days: number, now = Date.now()): Overview {
  const since = now - days * DAY;
  const sentMsgs = msgs.filter((m) => m.status !== "hata" && Date.parse(m.sent_at) >= since);
  const bounced = sentMsgs.filter((m) => m.status === "bounce").length;
  const replied = sentMsgs.filter((m) => m.replied_at).length;
  const recent = enrolls.filter((e) => inRange(e.last_reply_at, since));
  const positive = recent.filter((e) => (POSITIVE as readonly string[]).includes(e.lead_status)).length;
  const meetings = recent.filter((e) => (MEETING as readonly string[]).includes(e.lead_status)).length;

  const byDay = new Map<string, Day>();
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey(now - i * DAY);
    byDay.set(k, { date: k, sent: 0, replied: 0, bounced: 0 });
  }
  for (const m of sentMsgs) {
    const d = byDay.get(dayKey(m.sent_at));
    if (d) {
      d.sent++;
      if (m.status === "bounce") d.bounced++;
    }
  }
  for (const m of msgs) {
    if (m.replied_at && Date.parse(m.replied_at) >= since) {
      const d = byDay.get(dayKey(m.replied_at));
      if (d) d.replied++;
    }
  }

  return {
    days,
    totals: { sent: sentMsgs.length, replied, bounced, positive, meetings, unsubscribed },
    rates: { reply: pct(replied, sentMsgs.length - bounced), bounce: pct(bounced, sentMsgs.length), positive: pct(positive, sentMsgs.length - bounced) },
    daily: [...byDay.values()],
  };
}

/** Kampanya ya da gönderici adresi bazında kırılım (kimliği olmayan kayıtlar atlanır). */
export function groupBy(msgs: RMsg[], enrolls: REnroll[], key: "sequence_id" | "mailbox_id", days: number, now = Date.now()): GroupRow[] {
  const since = now - days * DAY;
  const rows = new Map<string, GroupRow>();
  const row = (id: string) => {
    let r = rows.get(id);
    if (!r) rows.set(id, (r = { id, sent: 0, replied: 0, bounced: 0, positive: 0, meetings: 0 }));
    return r;
  };
  for (const m of msgs) {
    const id = m[key];
    if (!id || m.status === "hata" || Date.parse(m.sent_at) < since) continue;
    const r = row(id);
    r.sent++;
    if (m.replied_at) r.replied++;
    if (m.status === "bounce") r.bounced++;
  }
  for (const e of enrolls) {
    const id = e[key];
    if (!id || !inRange(e.last_reply_at, since)) continue;
    const r = row(id);
    if ((POSITIVE as readonly string[]).includes(e.lead_status)) r.positive++;
    if ((MEETING as readonly string[]).includes(e.lead_status)) r.meetings++;
  }
  return [...rows.values()].sort((a, b) => b.sent - a.sent);
}
