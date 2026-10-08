import { describe, expect, it } from "vitest";
import { draftFromAnalysis } from "./sanitize";

describe("draftFromAnalysis", () => {
  it("hazır seçenekleri koda, diğerlerini kısa ifadeye çevirir", () => {
    const d = draftFromAnalysis({
      businessName: "Yıldız Mali Müşavirlik",
      workType: "buro",
      services: ["muhasebe", "Vergi danışmanlığı", "bordro hizmeti"],
      targetSectors: ["Restoran ve kafe"],
      targetSizes: ["mikro", "kucuk"],
    });
    expect(d.workType).toBe("buro");
    expect(d.services).toEqual(["muhasebe", "vergi", "Bordro hizmeti"]);
    expect(d.targetSectors).toEqual(["restoran"]);
    expect(d.targetSizes).toEqual(["mikro", "kucuk"]);
  });

  it("şehirleri yalnızca bilinen illerden alır", () => {
    const d = draftFromAnalysis({ cityScope: "cities", targetCities: ["istanbul", "Kadıköy", "Atlantis"] });
    expect(d.cityScope).toBe("cities");
    expect(d.targetCities).toEqual(["İstanbul"]);
  });

  it("bağlantı, etiket ve aşırı uzun metinleri forma sokmaz", () => {
    const d = draftFromAnalysis({
      businessName: "<script>x</script>",
      services: ["https://kotu.example", "a@b.com", "x".repeat(60), "SEO"],
      targetSizes: ["dev", "farketmez", "mikro"],
    });
    expect(d.businessName).toBeUndefined();
    expect(d.services).toEqual(["seo"]);
    expect(d.targetSizes).toEqual(["farketmez"]);
  });

  it("modelin uydurduğu geçersiz yapıyı yok sayar, algılanan kanalları korur", () => {
    expect(draftFromAnalysis("saçma", ["telefon"])).toEqual({ channels: ["telefon"] });
    expect(draftFromAnalysis(null)).toEqual({});
  });

  it("uzun açıklamayı 500 karakterde, kelime sınırında keser", () => {
    const d = draftFromAnalysis({ businessDescription: "kelime ".repeat(200) });
    expect(d.businessDescription!.length).toBeLessThanOrEqual(500);
    expect(d.businessDescription!.endsWith("kelime")).toBe(true);
  });
});
