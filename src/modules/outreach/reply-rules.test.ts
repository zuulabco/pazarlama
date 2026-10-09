import { describe, expect, it } from "vitest";
import { classifyReplyText, ownText, previewOf } from "./reply-rules";

describe("yanıt etiketleme (kural tabanlı)", () => {
  it("olumsuz ifadeleri öncelikle yakalar", () => {
    expect(classifyReplyText("Teşekkürler, ilgilenmiyoruz.")).toBe("ilgisiz");
    expect(classifyReplyText("Toplantı istemiyoruz, lütfen listeden çıkarın")).toBe("ilgisiz");
    expect(classifyReplyText("Not interested, thanks")).toBe("ilgisiz");
    expect(classifyReplyText("Please remove me from your list")).toBe("ilgisiz");
  });
  it("yanlış kişiyi ayırt eder", () => {
    expect(classifyReplyText("Ben bu konuda sorumlu değilim, ilgili kişi Ayşe Hanım")).toBe("yanlis_kisi");
    expect(classifyReplyText("Ali artık burada çalışmıyor")).toBe("yanlis_kisi");
    expect(classifyReplyText("I'm not the right person for this")).toBe("yanlis_kisi");
  });
  it("toplantı ve ilgi sinyallerini yakalar", () => {
    expect(classifyReplyText("Perşembe günü görüşebiliriz, takviminize bakın")).toBe("toplanti");
    expect(classifyReplyText("Let's schedule a call next week")).toBe("toplanti");
    expect(classifyReplyText("İlgileniyoruz, fiyat bilgisi alabilir miyiz?")).toBe("ilgili");
    expect(classifyReplyText("Sounds good, send me more details")).toBe("ilgili");
  });
  it("belirsiz metinde null döner", () => {
    expect(classifyReplyText("Tamamdır.")).toBeNull();
    expect(classifyReplyText("")).toBeNull();
  });
  it("alıntılanan eski metni yok sayar", () => {
    const body = "Evet, ilgileniyoruz.\n\nOn Mon, Oct 5, 2026 Elif wrote:\n> Kısa bir soru: ilgilenmiyorsanız yazmanız yeterli";
    expect(classifyReplyText(body)).toBe("ilgili");
    expect(ownText(body)).toBe("Evet, ilgileniyoruz.");
  });
  it("önizleme tek satırdır ve kısaltılır", () => {
    expect(previewOf("Merhaba\n\nçok iyi,   yarın arayın")).toBe("Merhaba çok iyi, yarın arayın");
    expect(previewOf("a".repeat(300), 20)).toHaveLength(20);
  });
});

describe("yanıtla çıkış (İPTAL)", () => {
  it("kısa çıkış yanıtlarını ve açık ifadeleri tanır", async () => {
    const { isOptOutReply } = await import("./reply-rules");
    for (const t of ["İPTAL", "iptal", "İptal edin lütfen", "ÇIKAR", "stop", "Unsubscribe", "Abonelikten çıkmak istiyorum", "Lütfen beni listeden çıkarın", "Bir daha yazmayın", "Please remove me", "iptal\n\n> Merhaba, kısa bir sorum var"]) {
      expect(isOptOutReply(t), t).toBe(true);
    }
  });
  it("normal yanıtları çıkış saymaz", async () => {
    const { isOptOutReply } = await import("./reply-rules");
    for (const t of ["Randevumu iptal etmek istiyorum, perşembe yerine cuma olabilir mi?", "Teşekkürler, fiyat bilgisi alabilir miyiz?", "Şu an ilgilenmiyoruz ama sonra yazabilirsiniz", "", "Stop motion animasyon hizmetiniz var mı?"]) {
      expect(isOptOutReply(t), t).toBe(false);
    }
  });
});
