import { describe, expect, it } from "vitest";
import { bounceBand, bounceRate, pauseMessage, shouldPause } from "./bounce-guard";

describe("Bounce Guard", () => {
  it("Apollo bantlarını uygular", () => {
    expect([0, 3.9, 4, 5.4, 5.5, 20].map(bounceBand)).toEqual(["iyi", "iyi", "gelisebilir", "gelisebilir", "kritik", "kritik"]);
    expect(bounceRate(0, 0)).toBe(0);
    expect(bounceRate(200, 11)).toBeCloseTo(5.5);
  });
  it("yeterli hacim yoksa duraklatmaz, varsa eşikte duraklatır", () => {
    expect(shouldPause(10, 5)).toBe(false); // %50 ama 10 e-posta: örnek az
    expect(shouldPause(100, 5)).toBe(false); // %5 < %5,5
    expect(shouldPause(100, 6)).toBe(true);
    expect(shouldPause(40, 3, { pause: 5, minVolume: 30 })).toBe(true);
  });
  it("duraklatma mesajı oranı Türkçe biçimde yazar", () => {
    expect(pauseMessage(6.25)).toContain("%6,3");
  });
});

import { activationProblems } from "./activation";
import { defaultSettings, blankVariant, type Step } from "./sequence-schema";
import type { Mailbox } from "./mailbox-schema";
import { starters } from "./starters";

const step = (over: Partial<Step> = {}): Step => ({ id: "s", position: 0, kind: "email", delayMinutes: 0, enabled: true, variants: [{ ...blankVariant(), subject: "Konu", body: "Mesaj" }], task: { title: "", notes: "" }, ...over });
const mailbox = (over: Partial<Mailbox> = {}): Mailbox => ({
  id: "m1", email: "a@firma.com", fromName: null, signature: "", provider: "gmail", smtp: { host: "h", port: 465, secure: true }, imap: { host: "h", port: 993, secure: true }, username: "a@firma.com",
  status: "bagli", lastError: null, dailyLimit: 20, hourlyLimit: 6, warmupEnabled: false, warmupStartedAt: null, warmupScore: null,
  dnsCheck: { domain: "firma.com", managed: false, ready: true, checks: [] }, dnsCheckedAt: null, createdAt: "", ...over,
});

describe("activationProblems", () => {
  it("hazır kampanya sorunsuzdur", () => {
    expect(activationProblems({ steps: [step()], settings: defaultSettings }, [mailbox()])).toEqual([]);
  });
  it("adım, boş mesaj, gönderici adresi ve alan adı sorunlarını ayrı ayrı bildirir", () => {
    expect(activationProblems({ steps: [], settings: defaultSettings }, [mailbox()]).map((p) => p.code)).toEqual(["adim"]);
    const empty = activationProblems({ steps: [step({ variants: [blankVariant()] })], settings: defaultSettings }, [mailbox()]);
    expect(empty[0]).toMatchObject({ code: "bos_mesaj", message: "1. adımın konusu ya da mesajı boş." });
    expect(activationProblems({ steps: [step()], settings: defaultSettings }, []).map((p) => p.code)).toEqual(["posta_kutusu"]);
    expect(activationProblems({ steps: [step()], settings: defaultSettings }, [mailbox({ status: "hata" })]).map((p) => p.code)).toEqual(["posta_kutusu"]);
    const dns = activationProblems({ steps: [step()], settings: defaultSettings }, [mailbox({ dnsCheck: { domain: "f.com", managed: false, ready: false, checks: [{ key: "dkim", title: "DKIM", status: "eksik", detail: "" }] } })]);
    expect(dns[0]).toMatchObject({ code: "alan_adi", overridable: true });
    expect(dns[0].message).toContain("DKIM");
  });
  it("yalnızca DMARC eksikse kampanya engellenmez", () => {
    const dmarcOnly = mailbox({ dnsCheck: { domain: "f.com", managed: false, ready: false, checks: [{ key: "spf", title: "SPF", status: "ok", detail: "" }, { key: "dmarc", title: "DMARC", status: "eksik", detail: "" }] } });
    expect(activationProblems({ steps: [step()], settings: defaultSettings }, [dmarcOnly])).toEqual([]);
  });
  it("takip adımında konu boş olabilir; yalnızca ilk e-postada şarttır", () => {
    const steps = [step(), step({ id: "t", position: 1, variants: [{ ...blankVariant("A", "takip"), body: "Takip" }] })];
    expect(activationProblems({ steps, settings: defaultSettings }, [mailbox()])).toEqual([]);
  });
  it("yalnızca arama/görev adımı olan kampanya gönderici adresi istemez", () => {
    expect(activationProblems({ steps: [step({ kind: "arama" })], settings: defaultSettings }, [])).toEqual([]);
  });
});

describe("hazır şablonlar", () => {
  it("her şablonun en az bir adımı vardır ve ilk e-postada konu/mesaj doludur", () => {
    for (const s of starters) {
      expect(s.steps.length).toBeGreaterThan(0);
      const first = s.steps.find((x) => x.kind === "email")!;
      expect(first.variants[0].subject.length).toBeGreaterThan(3);
      expect(first.variants[0].body.length).toBeGreaterThan(40);
    }
  });
});

import { buildReport } from "./report";

describe("buildReport", () => {
  const steps: Step[] = [step({ id: "s1" }), step({ id: "s2", position: 1, variants: [{ ...blankVariant("A"), subject: "a", body: "a" }, { ...blankVariant("B"), subject: "b", body: "b" }] })];
  const now = Date.parse("2026-10-08T12:00:00Z");
  const msg = (over: Partial<Parameters<typeof buildReport>[1][number]> = {}) => ({ step_id: "s1", variant_key: "A", status: "gonderildi", replied_at: null, open_count: 0, click_count: 0, sent_at: "2026-10-07T10:00:00Z", ...over });

  it("toplamları, oranları ve adım/varyant kırılımını hesaplar", () => {
    const r = buildReport(
      steps,
      [msg(), msg({ replied_at: "x" }), msg({ status: "bounce" }), msg({ step_id: "s2", variant_key: "B", replied_at: "x", open_count: 2 }), msg({ status: "hata" })],
      [{ status: "bitti", finish_reason: "yanit" }, { status: "bitti", finish_reason: "abonelik" }, { status: "aktif", finish_reason: null }],
      now,
    );
    expect(r.totals).toMatchObject({ enrolled: 3, active: 1, finished: 2, sent: 4, replied: 2, bounced: 1, unsubscribed: 1, opened: 1 });
    expect(r.rates.bounce).toBeCloseTo(25);
    expect(r.rates.reply).toBeCloseTo((2 / 3) * 100);
    expect(r.steps[0]).toMatchObject({ sent: 3, replied: 1, bounced: 1 });
    expect(r.steps[1].variants).toEqual([{ key: "A", sent: 0, replied: 0 }, { key: "B", sent: 1, replied: 1 }]);
    expect(r.finishReasons).toEqual({ yanit: 1, abonelik: 1 });
  });
  it("sağlık bandını son 7 günden hesaplar (eski gönderimleri saymaz)", () => {
    const old = msg({ status: "bounce", sent_at: "2026-09-01T10:00:00Z" });
    const r = buildReport(steps, [old, msg(), msg(), msg(), msg()], [], now);
    expect(r.health).toMatchObject({ sent: 4, bounced: 0, band: "iyi" });
  });
});
