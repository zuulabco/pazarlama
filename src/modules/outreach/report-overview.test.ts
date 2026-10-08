import { describe, expect, it } from "vitest";
import { buildOverview, groupBy, type REnroll, type RMsg } from "./report-overview";

const now = Date.parse("2026-10-10T12:00:00Z");
const msg = (over: Partial<RMsg> = {}): RMsg => ({ sent_at: "2026-10-10T08:00:00Z", status: "gonderildi", replied_at: null, sequence_id: "s1", mailbox_id: "m1", ...over });
const enr = (over: Partial<REnroll> = {}): REnroll => ({ sequence_id: "s1", mailbox_id: "m1", lead_status: "lead", last_reply_at: "2026-10-10T09:00:00Z", ...over });

describe("genel bakış", () => {
  const msgs = [
    msg(),
    msg({ replied_at: "2026-10-10T10:00:00Z" }),
    msg({ status: "bounce" }),
    msg({ sent_at: "2026-10-08T08:00:00Z", replied_at: "2026-10-09T08:00:00Z" }),
    msg({ status: "hata" }),
    msg({ sent_at: "2026-08-01T08:00:00Z" }), // aralık dışı
  ];
  const enrolls = [enr({ lead_status: "ilgili" }), enr({ lead_status: "toplanti" }), enr({ lead_status: "ilgisiz" }), enr({ lead_status: "kazanildi", last_reply_at: "2026-08-01T00:00:00Z" })];

  it("toplamları ve oranları hesaplar (bounce'lar yanıt oranı paydasından düşer)", () => {
    const o = buildOverview(msgs, enrolls, 2, 7, now);
    expect(o.totals).toEqual({ sent: 4, replied: 2, bounced: 1, positive: 2, meetings: 1, unsubscribed: 2 });
    expect(o.rates.bounce).toBeCloseTo(25);
    expect(o.rates.reply).toBeCloseTo((2 / 3) * 100);
    expect(o.rates.positive).toBeCloseTo((2 / 3) * 100);
  });
  it("günlük seriyi sıfırlarla doldurur", () => {
    const o = buildOverview(msgs, enrolls, 0, 7, now);
    expect(o.daily).toHaveLength(7);
    expect(o.daily.at(-1)).toMatchObject({ date: "2026-10-10", sent: 3, replied: 1, bounced: 1 });
    expect(o.daily.find((d) => d.date === "2026-10-08")).toMatchObject({ sent: 1 });
    expect(o.daily.find((d) => d.date === "2026-10-09")).toMatchObject({ sent: 0, replied: 1 });
    expect(o.daily.find((d) => d.date === "2026-10-05")).toMatchObject({ sent: 0 });
  });
  it("gönderim yoksa oranlar 0'dır", () => {
    expect(buildOverview([], [], 0, 7, now).rates).toEqual({ reply: 0, bounce: 0, positive: 0 });
  });
});

describe("kırılım", () => {
  it("kampanya bazında toplar ve gönderime göre sıralar", () => {
    const rows = groupBy([msg(), msg(), msg({ sequence_id: "s2", replied_at: "2026-10-10T10:00:00Z" })], [enr({ sequence_id: "s2", lead_status: "toplanti" })], "sequence_id", 7, now);
    expect(rows.map((r) => r.id)).toEqual(["s1", "s2"]);
    expect(rows[1]).toMatchObject({ sent: 1, replied: 1, positive: 1, meetings: 1 });
  });
  it("gönderici adresi bazında toplar, kimliksizleri atlar", () => {
    const rows = groupBy([msg({ mailbox_id: null }), msg({ mailbox_id: "m2", status: "bounce" })], [], "mailbox_id", 7, now);
    expect(rows).toEqual([{ id: "m2", sent: 1, replied: 0, bounced: 1, positive: 0, meetings: 0 }]);
  });
});
