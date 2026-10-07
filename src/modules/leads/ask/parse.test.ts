import { describe, expect, it } from "vitest";
import { parseQuestion } from "./parse";

const districts = ["Kadıköy", "Bostancı", "Suadiye"];

describe("parseQuestion", () => {
  it("web sitesi olmayanları listeler", () => {
    const i = parseQuestion("Web sitesi olmayan firmaları göster");
    expect(i.kind).toBe("list");
    expect(i.filters.web).toBe("yok");
  });

  it("telefonu olan ve sitesi olmayanı birlikte çözer", () => {
    const i = parseQuestion("telefonu olan ama web sitesi olmayan firmalar hangileri?");
    expect(i.filters).toMatchObject({ web: "yok", tel: "var" });
    expect(i.kind).toBe("list");
  });

  it("puan, yorum ve skor eşiklerini ayırır", () => {
    const i = parseQuestion("4,5 puan üstü, 200 yorumdan fazla ve skoru 70 üstü olanlar");
    expect(i.filters).toMatchObject({ minRating: 4.5, minReviews: 200, minScore: 70 });
  });

  it("dijital ihtiyaç eşiğini skordan ayırır", () => {
    const i = parseQuestion("dijital ihtiyacı 80 üstü firmalar");
    expect(i.filters.minDigital).toBe(80);
    expect(i.filters.minScore).toBeUndefined();
  });

  it("sayı soruları istatistik olur", () => {
    const i = parseQuestion("Kaç firmanın web sitesi yok?");
    expect(i.kind).toBe("stats");
    expect(i.filters.web).toBe("yok");
    expect(parseQuestion("ortalama skor kaç?").kind).toBe("stats");
  });

  it("sıralama ve adet", () => {
    const i = parseQuestion("dijital ihtiyacı en yüksek ilk 3 firma");
    expect(i.sort).toBe("digital");
    expect(i.limit).toBe(3);
    expect(parseQuestion("en çok yoruma sahip 4 firma").sort).toBe("reviews");
    expect(parseQuestion("en iyi firma hangisi").limit).toBe(1);
  });

  it("adet üst sınırı 20", () => {
    expect(parseQuestion("ilk 500 firmayı listele").limit).toBe(20);
  });

  it("semt süzgeci", () => {
    expect(parseQuestion("Kadıköy'deki firmaları göster", districts).filters.district).toBe("Kadıköy");
    expect(parseQuestion("suadiyedeki firmalar", districts).filters.district).toBe("Suadiye");
  });

  it("yorum ve öneri soruları dil modeline gider", () => {
    expect(parseQuestion("Hangisini önce aramalıyım ve neden?").kind).toBe("interpret");
    expect(parseQuestion("İlk mesajda ne söylemeliyim?").kind).toBe("interpret");
    expect(parseQuestion("web sitesi olmayanlar arasında kime teklif vermeliyim").kind).toBe("interpret");
  });

  it("anlaşılmayan soru dil modeline gider", () => {
    expect(parseQuestion("bu sektör nasıl bir yer").kind).toBe("interpret");
  });
});
