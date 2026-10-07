import { describe, expect, it } from "vitest";
import { defaultConfig, normalizePhone, parseSheetId, validateConfig, type SupportConfig } from "./config";
import { buildWorkflow, names } from "./workflow";

const base: SupportConfig = {
  ...defaultConfig,
  businessName: "Deniz Otel",
  adminEmail: "yonetici@denizotel.com",
  fromEmail: "destek@denizotel.com",
  phoneNumberId: "123456789012345",
  sheetId: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
  whatsapp: true,
  email: true,
  notifyEmail: true,
  notifyWhatsapp: true,
  adminPhone: "0532 123 45 67",
};

const names_ = (c: SupportConfig) => buildWorkflow(c).nodes.map((n) => n.name);

describe("buildWorkflow", () => {
  it("geçerli ayarlarda hata yoktur", () => {
    expect(validateConfig(base)).toEqual({});
  });

  it("tüm bağlantılar var olan düğümleri gösterir ve adlar benzersizdir", () => {
    const wf = buildWorkflow(base);
    const all = wf.nodes.map((n) => n.name);
    expect(new Set(all).size).toBe(all.length);
    for (const [from, v] of Object.entries(wf.connections)) {
      expect(all).toContain(from);
      v.main.flat().forEach((t) => expect(all).toContain(t.node));
    }
  });

  it("yalnızca seçilen kanalları ve çıkışları üretir", () => {
    const only = names_({ ...base, email: false, notifyEmail: false, notifyWhatsapp: false, logSheet: false, autoReply: false });
    expect(only).toEqual([names.whatsappTrigger, names.normalize, names.translate, names.process, names.note]);
    expect(names_(base)).toContain(names.sourceCheck);
    expect(names_({ ...base, email: false })).not.toContain(names.sourceCheck);
  });

  it("kimlik bilgisi içermez ve JSON'a dönüşür", () => {
    const text = JSON.stringify(buildWorkflow(base));
    expect(text).not.toContain('"credentials"');
    expect(JSON.parse(text).nodes.length).toBeGreaterThan(5);
  });

  it("işletme adındaki süslü parantezleri temizler", () => {
    expect(buildWorkflow({ ...base, businessName: "A{{x}}B" }).name).toContain("AxB");
  });
});

/** Code düğümü gövdesini sahte n8n ortamında çalıştırır. */
function run(code: string, items: unknown[], prev: Record<string, unknown[]> = {}) {
  const fn = new Function("$input", "$", code);
  const $ = (name: string) => ({ itemMatching: (i: number) => ({ json: prev[name]?.[i] }) });
  return fn({ all: () => items.map((json) => ({ json })) }, $) as { json: Record<string, string> }[];
}
const code = (name: string) => buildWorkflow(base).nodes.find((n) => n.name === name)!.parameters.jsCode as string;

describe("Mesajı Düzenle", () => {
  const norm = code(names.normalize);
  it("WhatsApp metnini ve göndereni okur", () => {
    const [r] = run(norm, [{ messages: [{ from: "491701234567", type: "text", text: { body: "Hallo" } }], contacts: [{ profile: { name: "Anna" } }] }]);
    expect(r.json).toMatchObject({ sourceType: "whatsapp", sourceId: "491701234567", senderName: "Anna", originalMessage: "Hallo" });
    expect(r.json.referenceId).toMatch(/^DST-/);
  });
  it("metinsiz WhatsApp mesajında hata vermez", () => {
    const [r] = run(norm, [{ messages: [{ from: "1", type: "sticker" }] }]);
    expect(r.json.originalMessage).toContain("sticker");
  });
  it("e-postada adresi ve konuyu çıkarır", () => {
    const [r] = run(norm, [{ from: '"Hans Müller" <hans@example.de>', subject: "Frage", textPlain: "Wo ist meine Buchung?" }]);
    expect(r.json).toMatchObject({ sourceType: "email", sourceId: "hans@example.de", senderName: "Hans Müller" });
    expect(r.json.originalMessage).toBe("Frage\nWo ist meine Buchung?");
  });
  it("döngü yaratacak postaları atlar", () => {
    const skip = [
      { from: "destek@denizotel.com", subject: "x", textPlain: "x" },
      { from: "noreply@x.com", subject: "x", textPlain: "x" },
      { from: "a@b.com", subject: "[Destek • YÜKSEK] WhatsApp", textPlain: "x" },
      { from: "a@b.com", subject: "x", textPlain: "x", headers: { "auto-submitted": "auto-replied" } },
      { statuses: [{ status: "read" }] },
    ];
    expect(run(norm, skip)).toHaveLength(0);
  });
});

describe("Özet ve Öncelik", () => {
  const proc = code(names.process);
  const prep = (original: string, translated: string, lang = "de") =>
    run(proc, [{ translatedText: translated, detectedSourceLanguage: lang }], {
      [names.normalize]: [{ originalMessage: original, sourceType: "whatsapp", sourceId: "49", senderName: "Anna", referenceId: "DST-1", subject: "" }],
    })[0].json;
  it("acil mesajı YÜKSEK yapar", () => {
    expect(prep("Das ist dringend", "Bu acil, lütfen yardım edin").priority).toBe("YÜKSEK");
  });
  it("sorunu ORTA, sıradan mesajı DÜŞÜK yapar", () => {
    expect(prep("x", "Ürününüzde bir sorun var").priority).toBe("ORTA");
    expect(prep("Hallo", "Merhaba, fiyat bilgisi alabilir miyim?").priority).toBe("DÜŞÜK");
  });
  it("dili ve bildirim metnini üretir; dil yoksa yönetici diline düşer", () => {
    const r = prep("Hallo", "Merhaba");
    expect(r.originalLanguage).toBe("de");
    expect(r.emailSubject).toContain("[Destek •");
    expect(prep("Hallo", "Merhaba", "").originalLanguage).toBe("tr");
  });
});

describe("yardımcılar", () => {
  it("telefon numarasını normalleştirir", () => {
    expect(normalizePhone("0532 123 45 67")).toBe("905321234567");
    expect(normalizePhone("+49 170 1234567")).toBe("491701234567");
    expect(normalizePhone("123")).toBe("");
  });
  it("tablo adresinden kimliği çıkarır", () => {
    const id = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";
    expect(parseSheetId(`https://docs.google.com/spreadsheets/d/${id}/edit#gid=0`)).toBe(id);
    expect(parseSheetId(id)).toBe(id);
    expect(parseSheetId("merhaba")).toBe("");
  });
  it("eksik alanları bildirir", () => {
    const e = validateConfig({ ...defaultConfig, whatsapp: false, email: false });
    expect(e.businessName).toBeDefined();
    expect(e.channels).toBeDefined();
  });
});
