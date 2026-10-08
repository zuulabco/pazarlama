import { describe, expect, it } from "vitest";
import { openerMessages, openerSchema, sequenceMessages, sequenceSchema, stepFromTemplate, stripClosing, cleanSubject, templateMessages, templateSchema, type SenderContext } from "./ai-prompts";

const sender: SenderContext = { businessName: "Yıldız Mali Müşavirlik", firstName: "Elif", workType: "buro", services: ["Muhasebe", "Vergi danışmanlığı"], description: "Küçük işletmelere muhasebe veriyoruz." };
const ai = { type: "tanisma", tone: "samimi", length: "kisa", extra: "" } as const;

describe("templateMessages", () => {
  it("kuralları, değişkenleri ve gönderen verisini içerir; kullanıcı isteğini etiketler", () => {
    const [system] = templateMessages({ settings: { ...ai, extra: "Cuma uygun olduğumu yaz" }, mode: "asistan", service: "Vergi danışmanlığı", sender });
    expect(system.content).toContain("{{first_name}}");
    expect(system.content).toContain("İmza, firma bilgisi satırı ve abonelikten çıkma satırı EKLEME");
    expect(system.content).toContain("<istek>Cuma uygun olduğumu yaz</istek>");
    expect(system.content).toContain("Önerilecek tek hizmet: Vergi danışmanlığı");
    expect(system.content).toContain("60-90 kelime");
    expect(system.content).toContain("Yıldız Mali Müşavirlik");
  });
  it("istem modunda serbest istemi kullanır; takipte önceki konuyu bildirir", () => {
    const [system] = templateMessages({ settings: { ...ai, type: "takip" }, mode: "istem", prompt: "kısa ve esprisiz olsun", previousSubject: "Kısa bir soru", sender });
    expect(system.content).toContain("<istek>kısa ve esprisiz olsun</istek>");
    expect(system.content).toContain("Önceki e-postanın konusu: \"Kısa bir soru\"");
  });
});

describe("sequenceMessages / openerMessages", () => {
  it("adım sayısını 2-5 arasında tutar ve kitle/amacı veri etiketiyle verir", () => {
    const [s] = sequenceMessages({ goal: "Toplantı ayarlamak", audience: "Kadıköy diş klinikleri", steps: 99, tone: "net", sender });
    expect(s.content).toContain("5 adımlı");
    expect(s.content).toContain("<kitle>Kadıköy diş klinikleri</kitle>");
    expect(s.content).toContain("<amac>Toplantı ayarlamak</amac>");
  });
  it("açılış yalnızca sitedeki gerçeklere dayanır", () => {
    const [s, u] = openerMessages({ company: "Lale Diş", city: "Kadıköy", siteFacts: "Açıklama: İmplant ve ortodonti", sender });
    expect(s.content).toContain("YALNIZCA <site> içinde yazan gerçeklere dayan");
    expect(u.content).toContain("<site>Açıklama: İmplant ve ortodonti</site>");
  });
});

describe("çıktı doğrulama", () => {
  it("geçerli şablon ve kampanya çıktısını alır, geçersizi reddeder", () => {
    expect(templateSchema.parse({ konu: "Kısa bir soru", metin: "Merhaba {{first_name|}}, kısa bir sorum var; uygun musunuz?" }).konu).toBe("Kısa bir soru");
    expect(() => templateSchema.parse({ konu: "x", metin: "kısa" })).toThrow();
    expect(openerSchema.parse({ acilis: "" }).acilis).toBe("");
    const seq = sequenceSchema.parse({ adimlar: [{ tip: "bilinmeyen", bekleme_gun: "x", konu: 5, metin: "Merhaba, bu bir deneme metnidir ve yeterince uzundur." }] });
    expect(seq.adimlar[0]).toMatchObject({ tip: "takip", bekleme_gun: 3, konu: "" });
  });
  it("üretilen şablonu düzenlenebilir bir adıma çevirir", () => {
    const step = stepFromTemplate({ konu: "Konu", metin: "Metin ".repeat(5) }, "takip", 2880);
    expect(step).toMatchObject({ kind: "email", delayMinutes: 2880, enabled: true });
    expect(step.variants[0]).toMatchObject({ key: "A", mode: "sablon", subject: "Konu", opener: false });
    expect(step.variants[0].ai.type).toBe("takip");
  });
});

describe("stripClosing", () => {
  it("sondaki kapanış ve imza satırlarını atar, gövdeyi korur", () => {
    expect(stripClosing("Merhaba,\n\nKısa bir sorum var.\n\nSaygılarımla,\nElif")).toBe("Merhaba,\n\nKısa bir sorum var.");
    expect(stripClosing("Merhaba,\n\nTeşekkürler\nElif Yıldız\nYıldız MM")).toBe("Merhaba,");
    expect(stripClosing("Merhaba,\n\nSaygılarımla bir şey sormak istiyorum, uygun musunuz?")).toBe("Merhaba,\n\nSaygılarımla bir şey sormak istiyorum, uygun musunuz?");
  });
  it("kapanış yoksa metni olduğu gibi (kırpılmış) bırakır", () => {
    expect(stripClosing("  Merhaba, nasılsınız?  ")).toBe("Merhaba, nasılsınız?");
  });
  it("takip isteminde alıcının soru sormadığını açıkça belirtir", () => {
    const [s] = templateMessages({ settings: { type: "takip", tone: "samimi", length: "kisa", extra: "" }, mode: "asistan", sender });
    expect(s.content).toContain("ASLA ima etme");
  });
});

describe("kapanış ve konu temizliği (Türkçe büyük harf)", () => {
  it("“İyi çalışmalar,” ve “Sağ kal,” gibi satırları atar", () => {
    expect(stripClosing("Merhaba,\n\nKısa soru.\n\nİyi çalışmalar,")).toBe("Merhaba,\n\nKısa soru.");
    expect(stripClosing("Merhaba,\n\nKısa soru.\n\nSağ kal,\n{{sender_first_name}}")).toBe("Merhaba,\n\nKısa soru.");
  });
  it("konudaki sahte Re: önekini atar", () => {
    expect(cleanSubject("Re: Re: Kısa bir soru")).toBe("Kısa bir soru");
    expect(cleanSubject("Yanıt: konu")).toBe("konu");
    expect(cleanSubject("Revize teklif")).toBe("Revize teklif");
  });
});
