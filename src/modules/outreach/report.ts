import { bounceBand, bounceRate, guardDefaults, type Band } from "./bounce-guard";
import type { Step } from "./sequence-schema";
import { stepLabel } from "./sequence-schema";

/** Otomasyon raporu (saf toplama): gönderim günlüğü ve kişi kayıtlarından toplamlar, adım/varyant kırılımı ve sağlık bandı. */

export type MsgLite = { step_id: string | null; variant_key: string; status: string; replied_at: string | null; open_count: number; click_count: number; sent_at: string };
export type EnrollLite = { status: string; finish_reason: string | null };

export type StepReport = { index: number; kind: string; label: string; sent: number; replied: number; bounced: number; variants: { key: string; sent: number; replied: number }[] };

export type SequenceReport = {
  totals: { enrolled: number; active: number; finished: number; paused: number; failed: number; sent: number; replied: number; bounced: number; unsubscribed: number; opened: number; clicked: number };
  rates: { reply: number; bounce: number; open: number };
  steps: StepReport[];
  finishReasons: Record<string, number>;
  health: { rate: number; band: Band; sent: number; bounced: number; windowDays: number };
};

export function buildReport(steps: Step[], msgs: MsgLite[], enrollments: EnrollLite[], now = Date.now()): SequenceReport {
  const sentMsgs = msgs.filter((m) => m.status !== "hata");
  const count = (s: string) => enrollments.filter((e) => e.status === s).length;
  const finishReasons: Record<string, number> = {};
  for (const e of enrollments) if (e.finish_reason) finishReasons[e.finish_reason] = (finishReasons[e.finish_reason] ?? 0) + 1;

  const sent = sentMsgs.length;
  const replied = sentMsgs.filter((m) => m.replied_at).length;
  const bounced = sentMsgs.filter((m) => m.status === "bounce").length;
  const opened = sentMsgs.filter((m) => m.open_count > 0).length;
  const delivered = Math.max(sent - bounced, 0);

  const since = now - guardDefaults.windowDays * 86_400_000;
  const recent = sentMsgs.filter((m) => Date.parse(m.sent_at) >= since);
  const recentBounced = recent.filter((m) => m.status === "bounce").length;
  const rate = bounceRate(recent.length, recentBounced);

  const active = steps.filter((s) => s.enabled);
  return {
    totals: {
      enrolled: enrollments.length,
      active: count("aktif"),
      finished: count("bitti"),
      paused: count("duraklatildi"),
      failed: count("hata"),
      sent,
      replied,
      bounced,
      unsubscribed: finishReasons.abonelik ?? 0,
      opened,
      clicked: sentMsgs.filter((m) => m.click_count > 0).length,
    },
    rates: { reply: delivered ? (replied / delivered) * 100 : 0, bounce: bounceRate(sent, bounced), open: delivered ? (opened / delivered) * 100 : 0 },
    steps: active.map((s, index) => {
      const mine = sentMsgs.filter((m) => m.step_id === s.id);
      const keys = [...new Set([...s.variants.map((v) => v.key), ...mine.map((m) => m.variant_key)])];
      return {
        index,
        kind: s.kind,
        label: stepLabel(s.kind),
        sent: mine.length,
        replied: mine.filter((m) => m.replied_at).length,
        bounced: mine.filter((m) => m.status === "bounce").length,
        variants: keys.map((key) => ({ key, sent: mine.filter((m) => m.variant_key === key).length, replied: mine.filter((m) => m.variant_key === key && m.replied_at).length })),
      };
    }),
    finishReasons,
    health: { rate, band: bounceBand(rate), sent: recent.length, bounced: recentBounced, windowDays: guardDefaults.windowDays },
  };
}
