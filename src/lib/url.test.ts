import { describe, expect, it } from "vitest";
import { normalizeSiteUrl } from "./url";

describe("normalizeSiteUrl", () => {
  it("şemasız adrese https ekler", () => {
    expect(normalizeSiteUrl("firma.com")).toBe("https://firma.com/");
    expect(normalizeSiteUrl(" www.firma.com.tr/hizmetler ")).toBe("https://www.firma.com.tr/hizmetler");
  });

  it("http(s) adreslerini korur, parçayı atar", () => {
    expect(normalizeSiteUrl("http://firma.com/a#iletisim")).toBe("http://firma.com/a");
  });

  it("alan adı olmayan girdileri reddeder", () => {
    for (const bad of ["", "firma", "firma .com", "localhost", "127.0.0.1", "http://10.0.0.1", "ftp://firma.com", "javascript:alert(1)", "https://a:b@firma.com", "firma.c"]) {
      expect(normalizeSiteUrl(bad), bad).toBeNull();
    }
  });
});
