import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { classifySmtpFailure, insertOpener, pickVariant } = await import("./sender");
const { parseHeaders, replySnippet } = await import("./scan");

const variant = (key: "A" | "B" | "C") => ({ key, mode: "sablon" as const, subject: key, body: key, ai: { type: "tanisma" as const, tone: "samimi" as const, length: "kisa" as const, extra: "" }, opener: false });

describe("pickVariant", () => {
  it("aynı kişi ve adım için hep aynı varyantı seçer, dağılım yaklaşık eşittir", () => {
    const vs = [variant("A"), variant("B")];
    expect(pickVariant(vs, "e1", "s1")).toBe(pickVariant(vs, "e1", "s1"));
    const counts = { A: 0, B: 0 };
    for (let i = 0; i < 400; i++) counts[pickVariant(vs, `enrollment-${i}`, "step-1").key as "A" | "B"]++;
    expect(counts.A).toBeGreaterThan(140);
    expect(counts.B).toBeGreaterThan(140);
    expect(pickVariant([variant("A")], "x", "y").key).toBe("A");
  });
});

describe("insertOpener", () => {
  it("açılışı selamlama satırından sonra yerleştirir", () => {
    expect(insertOpener("Merhaba Ayşe,\n\nKısa bir sorum var.", "Sitenizde implant hizmeti verdiğinizi gördüm.")).toBe(
      "Merhaba Ayşe,\n\nSitenizde implant hizmeti verdiğinizi gördüm.\n\nKısa bir sorum var.",
    );
  });
  it("selamlama yoksa en başa koyar", () => {
    expect(insertOpener("Kısa bir sorum var, uygun musunuz?", "Açılış.")).toBe("Açılış.\n\nKısa bir sorum var, uygun musunuz?");
  });
});

describe("classifySmtpFailure", () => {
  it("kimlik, alıcı yok ve geçici hataları ayırır", () => {
    expect(classifySmtpFailure({ code: "EAUTH" })).toBe("kimlik");
    expect(classifySmtpFailure({ responseCode: 535 })).toBe("kimlik");
    expect(classifySmtpFailure({ responseCode: 550, response: "550 5.1.1 The email account that you tried to reach does not exist" })).toBe("alici_yok");
    expect(classifySmtpFailure({ responseCode: 554, message: "554 5.1.0 recipient rejected" })).toBe("alici_yok");
    expect(classifySmtpFailure({ responseCode: 550, response: "550 5.7.1 message blocked as spam" })).toBe("gecici");
    expect(classifySmtpFailure({ code: "ETIMEDOUT" })).toBe("gecici");
    expect(classifySmtpFailure({ responseCode: 421 })).toBe("gecici");
  });
});

describe("scan yardımcıları", () => {
  it("başlıkları katlanmış satırlarla birlikte okur", () => {
    const h = parseHeaders("In-Reply-To: <a@b>\r\nReferences: <x@y>\r\n <a@b>\r\nAuto-Submitted: auto-replied\r\n");
    expect(h["in-reply-to"]).toBe("<a@b>");
    expect(h["references"]).toBe("<x@y> <a@b>");
    expect(h["auto-submitted"]).toBe("auto-replied");
  });
  it("yanıt özetinde alıntıları ve imzayı atar", () => {
    const text = "Teşekkürler, perşembe uygun.\nSaat 14:00 olur mu?\n\nOn Mon, 5 Oct 2026 Elif wrote:\n> Merhaba, kısa bir sorum var.";
    expect(replySnippet(text)).toBe("Teşekkürler, perşembe uygun. Saat 14:00 olur mu?");
    expect(replySnippet("Ok\n> alıntı")).toBe("Ok");
  });
});
