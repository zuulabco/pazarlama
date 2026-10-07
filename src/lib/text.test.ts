import { describe, expect, it } from "vitest";
import { provinces } from "../modules/profile/cities";
import { capitalize, fold, titleCase } from "./text";

describe("fold", () => {
  it("Türkçe harfleri ve büyük/küçük harf farkını yok sayar", () => {
    expect(fold("İstanbul")).toBe(fold("istanbul"));
    expect(fold("ISPARTA")).toBe(fold("Isparta"));
    expect(fold("Şanlıurfa")).toBe(fold("sanliurfa"));
    expect(fold("Hakkâri")).toBe(fold("hakkari"));
    expect(fold("Çanakkale")).toContain("canak");
  });
});

describe("capitalize / titleCase", () => {
  it("Türkçe kurallarıyla büyütür", () => {
    expect(capitalize("reklam")).toBe("Reklam");
    expect(capitalize("ışık")).toBe("Işık");
    expect(capitalize("iletişim")).toBe("İletişim");
    expect(titleCase("kadıköy ISTANBUL")).toBe("Kadıköy Istanbul");
  });
});

describe("provinces", () => {
  it("81 benzersiz il içerir", () => {
    expect(provinces).toHaveLength(81);
    expect(new Set(provinces.map(fold)).size).toBe(81);
  });

  it("her ile 'istanbul' gibi sade yazımla ulaşılabilir", () => {
    const find = (q: string) => provinces.filter((p) => fold(p).includes(fold(q)));
    expect(find("istanbul")).toEqual(["İstanbul"]);
    expect(find("sanliurfa")).toEqual(["Şanlıurfa"]);
    expect(find("igdir")).toEqual(["Iğdır"]);
  });
});
