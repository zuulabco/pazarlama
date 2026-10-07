import { describe, expect, it } from "vitest";
import { acceptProofread, buildMessages, deriveSignals, observations, parseDraft, suggestService, whatsappHref, whatsappNumber, withOptOut, type WorkFirm, type WorkSender } from "./context";

const firm: WorkFirm = {
  id: "f1",
  name: "Işık Diş Kliniği",
  category: "Diş kliniği",
  district: "Bostancı",
  phone: "0216 388 90 90",
  email: null,
  hasWebsite: false,
  closed: false,
  rating: 4.9,
  reviews: 516,
  score: 91,
  digital: 100,
  reach: 74,
  status: "takipte",
  signals: ["Google işletme profilinde web sitesi bağlantısı yok", "4,9 puan ve 516 yorum"],
  notes: ["Sahibi Ahmet Bey, öğleden sonra ulaşılabilir"],
};
const sender: WorkSender = { businessName: "Pikselatölye", firstName: "Deniz", workType: "ajans", services: ["web-tasarim", "seo"], description: "Küçük işletmelere web siteleri yapıyoruz." };

describe("deriveSignals", () => {
  it("web sitesi olmayan, çok yorumlu firmayı işaretler", () => {
    const s = deriveSignals({ website: false, phone: true, rating: 4.9, reviews: 516, imageCount: 4 });
    expect(s).toContain("Google işletme profilinde web sitesi bağlantısı yok");
    expect(s).toContain("4,9 puan ve 516 yorum");
    expect(s.some((x) => x.includes("müşteri ilgisi var"))).toBe(true);
    expect(s.some((x) => x.includes("sahiplenilmemiş"))).toBe(false);
    expect(s).toContain("Profilde yalnızca 4 fotoğraf var");
  });
  it("bilinmeyen alanlar için sinyal uydurmaz", () => {
    const s = deriveSignals({ website: true, phone: false, rating: null, reviews: null, imageCount: null });
    expect(s).toEqual(["Google işletme profilinde bir web sitesi bağlantısı var", "Telefon numarası görünmüyor"]);
  });
});

describe("suggestService", () => {
  it("web sitesi yoksa web hizmetini önerir", () => {
    expect(suggestService(["seo", "web-tasarim"], false)).toBe("web-tasarim");
    expect(suggestService(["seo", "web-tasarim"], true)).toBe("seo");
    expect(suggestService([], false)).toBeNull();
  });
});

describe("whatsapp", () => {
  it("numarayı uluslararası biçime çevirir", () => {
    expect(whatsappNumber("0216 388 90 90")).toBe("902163889090");
    expect(whatsappNumber("+90 533 215 10 55")).toBe("905332151055");
    expect(whatsappNumber("533 215 10 55")).toBe("905332151055");
    expect(whatsappNumber("123")).toBeNull();
  });
  it("metni kodlar", () => {
    expect(whatsappHref("0533 215 10 55", "Merhaba Ayşe")).toBe("https://wa.me/905332151055?text=Merhaba%20Ayşe".replace("ş", "%C5%9F"));
    expect(whatsappHref(null, "x")).toBeNull();
  });
});

describe("observations", () => {
  it("yalnızca gerçek gözlemleri doğal cümlelerle üretir", () => {
    const o = observations(firm);
    expect(o).toHaveLength(2);
    expect(o[0]).toContain("web sitesi bağlantısı göremedim");
    expect(o[1]).toContain("516 yorum ve 4,9 puan");
    expect(observations({ ...firm, hasWebsite: true, reviews: 5 })).toEqual([]);
  });
});

describe("buildMessages", () => {
  it("mesaj için: kurallar, örnek, sabit selamlama ve veri etiketleri", () => {
    const [system, user] = buildMessages({ kind: "message", goal: "ilk-temas", tone: "samimi", service: "web-tasarim", firm, sender });
    expect(system.content).toContain("Web tasarım");
    expect(system.content).toContain("en çok 70 kelime");
    expect(system.content).toContain('"Merhaba,"');
    expect(system.content).toContain("kopyalama");
    expect(system.content).toContain("uzmanlık, deneyim ya da referans");
    expect(system.content).toContain("görünürlüğünüz düşük");
    expect(system.content).toContain("Skor, puanlama");
    expect(user.content).toContain("<firma>");
    expect(user.content).toContain("gozlemler");
    expect(user.content).not.toContain("ic_degerlendirme");
    expect(user.content).toContain("Pikselatölye");
  });
  it("profesyonel ton farklı selamlama ve örnek kullanır", () => {
    const [system] = buildMessages({ kind: "message", goal: "ilk-temas", tone: "profesyonel", service: null, firm, sender });
    expect(system.content).toContain('"İyi günler,"');
    expect(system.content).not.toContain('"Merhaba,"');
    expect(system.content).toContain("Belirli bir hizmet önerme");
  });
  it("e-posta için konu satırı ve imza ister", () => {
    const [system] = buildMessages({ kind: "email", goal: "takip", tone: "profesyonel", service: null, firm, sender });
    expect(system.content).toContain('"konu"');
    expect(system.content).toContain("Deniz\nPikselatölye");
  });
  it("firma adına hitap etmeyi yasaklar", () => {
    const [system] = buildMessages({ kind: "message", goal: "ilk-temas", tone: "samimi", service: null, firm, sender });
    expect(system.content).toContain("Hanım/Bey");
    expect(system.content).toContain("ekibi");
  });
});

describe("acceptProofread", () => {
  const original = { subject: "Konu", body: "Merhaba, ben Deniz. İşletme profilinizi inceleirken bir şey fark ettim ve yazmak istedim." };
  it("küçük düzeltmeyi kabul eder", () => {
    expect(acceptProofread(original, { subject: "Konu", body: original.body.replace("inceleirken", "incelerken") })).toBe(true);
  });
  it("içeriği şişiren ya da kısaltan çıktıyı reddeder", () => {
    expect(acceptProofread(original, { subject: "Konu", body: original.body + " " + original.body })).toBe(false);
    expect(acceptProofread(original, { subject: "Konu", body: "Merhaba." })).toBe(false);
  });
  it("konu satırı kaybolursa reddeder", () => {
    expect(acceptProofread(original, { subject: null, body: original.body })).toBe(false);
  });
});

describe("parseDraft", () => {
  it("mesajı doğrular", () => {
    expect(parseDraft("message", { metin: "Merhaba, size kısa bir mesajım var." })).toEqual({ subject: null, body: "Merhaba, size kısa bir mesajım var." });
    expect(() => parseDraft("message", { metin: "" })).toThrow();
  });
  it("e-postaya çıkış satırı ekler", () => {
    const d = parseDraft("email", { konu: "Web siteniz hakkında", metin: "Merhaba, Google'da işletmenizi gördüm ve kısa bir fikrim var; uygun olursanız konuşalım." });
    expect(d.subject).toBe("Web siteniz hakkında");
    expect(d.body).toContain("yanıtlamanız yeterli");
  });
  it("çıkış satırı zaten varsa tekrar eklemez", () => {
    const body = "Merhaba.\n\nİstemezseniz yanıtlamanız yeterli.";
    expect(withOptOut(body)).toBe(body);
  });
});
