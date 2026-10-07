import { describe, expect, it } from "vitest";
import { businessTypes } from "./business-types";
import { canonicalDistrict, canonicalProvince, composeLocation, districtsOf } from "./location";

describe("il ve ilçe", () => {
  it("il adını sade yazımla da tanır", () => {
    expect(canonicalProvince("istanbul")).toBe("İstanbul");
    expect(canonicalProvince(" ŞANLIURFA ")).toBe("Şanlıurfa");
    expect(canonicalProvince("Atlantis")).toBeNull();
  });

  it("her ilin ilçeleri vardır", () => {
    expect(districtsOf("İstanbul")).toContain("Kadıköy");
    expect(districtsOf("ankara")).toContain("Çankaya");
    expect(districtsOf("Atlantis")).toEqual([]);
  });

  it("ilçeyi yalnızca kendi ilinde kabul eder", () => {
    expect(canonicalDistrict("İstanbul", "kadikoy")).toBe("Kadıköy");
    expect(canonicalDistrict("Ankara", "Kadıköy")).toBeNull();
  });

  it("konum metnini oluşturur", () => {
    expect(composeLocation("İstanbul", "Kadıköy")).toBe("Kadıköy, İstanbul");
    expect(composeLocation("İzmir")).toBe("İzmir");
  });
});

describe("firma türü önerileri", () => {
  it("tekrarsızdır ve makul uzunluktadır", () => {
    expect(new Set(businessTypes).size).toBe(businessTypes.length);
    expect(businessTypes.every((t) => t.length >= 2 && t.length <= 40)).toBe(true);
  });
});
