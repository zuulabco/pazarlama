import { describe, expect, it } from "vitest";
import { companyDomain, companyKey, limitPerCompany } from "./company";

const p = (email: string, company: string | null = null) => ({ email, company });

describe("şirket tespiti", () => {
  it("iş adresinin alan adını şirket sayar, ortak posta alan adlarını saymaz", () => {
    expect(companyDomain("ayse@Firma.com.tr")).toBe("firma.com.tr");
    expect(companyDomain("ayse@gmail.com")).toBeNull();
    expect(companyDomain(null)).toBeNull();
  });
  it("alan adı yoksa şirket adına döner (Türkçe duyarsız)", () => {
    expect(companyKey("ali@gmail.com", "Şeker İnşaat A.Ş.")).toBe("n:seker insaat a s");
    expect(companyKey("ali@gmail.com", "X")).toBeNull();
  });
});

describe("şirket başına sınır", () => {
  const items = [p("a@firma.com"), p("b@firma.com"), p("c@diger.com"), p("d@firma.com"), p("e@gmail.com")];
  it("1: her şirketten ilk kişi kalır, kişisel adresler sınırlanmaz", () => {
    const { kept, dropped } = limitPerCompany(items, 1);
    expect(kept.map((i) => i.email)).toEqual(["a@firma.com", "c@diger.com", "e@gmail.com"]);
    expect(dropped.map((i) => i.email)).toEqual(["b@firma.com", "d@firma.com"]);
  });
  it("2: iki kişiye izin verir", () => {
    expect(limitPerCompany(items, 2).kept.map((i) => i.email)).toEqual(["a@firma.com", "b@firma.com", "c@diger.com", "e@gmail.com"]);
  });
  it("0: sınırsız", () => {
    expect(limitPerCompany(items, 0).dropped).toEqual([]);
  });
  it("zaten kayıtlı kişisi olan şirketin kontenjanı düşer", () => {
    const existing = new Map([["d:firma.com", 1]]);
    const { kept } = limitPerCompany(items, 1, existing);
    expect(kept.map((i) => i.email)).toEqual(["c@diger.com", "e@gmail.com"]);
  });
});
