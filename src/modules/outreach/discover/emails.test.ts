import { describe, expect, it } from "vitest";
import { classifyEmail, cleanEmail, decodeCfEmail, extractEmails, isPlausibleEmail, pickContactLinks, rankCandidates, sameSite } from "./emails";

/** Cloudflare'ın "info@firma.com" için üreteceği gizli dizi (anahtar 0x4a). */
const cf = (email: string, key = 0x4a) => key.toString(16).padStart(2, "0") + [...email].map((c) => (c.charCodeAt(0) ^ key).toString(16).padStart(2, "0")).join("");

describe("extractEmails", () => {
  it("mailto, metin, JSON-LD, gizlenmiş ve Cloudflare adreslerini bulur", () => {
    const html = `<html><head><script type="application/ld+json">{"@type":"Dentist","email":"randevu@lale.com.tr"}</script></head>
      <body><a href="mailto:Info@Lale.com.tr?subject=Merhaba">Yaz</a>
      <p>Bize ulaşın: ahmet.yilmaz@lale.com.tr ya da muhasebe [at] lale [dot] com [dot] tr</p>
      <a class="__cf_email__" data-cfemail="${cf("destek@lale.com.tr")}">[email&#160;protected]</a>
      <img src="logo@2x.png"><span>user@example.com</span><span>sentry@wixpress.com</span>
      <script>var x = "gizli@olmayan.com";</script></body></html>`;
    const emails = extractEmails(html).map((e) => e.email).sort();
    expect(emails).toEqual(["ahmet.yilmaz@lale.com.tr", "destek@lale.com.tr", "info@lale.com.tr", "muhasebe@lale.com.tr", "randevu@lale.com.tr"]);
  });

  it("kaynağı işaretler: mailto en güvenilir", () => {
    const found = extractEmails(`<a href="mailto:a@firma.com">a</a> b@firma.com`);
    expect(found.find((f) => f.email === "a@firma.com")?.via).toBe("mailto");
    expect(found.find((f) => f.email === "b@firma.com")?.via).toBe("metin");
  });

  it("noreply, yer tutucu ve varlık adreslerini eler", () => {
    for (const bad of ["noreply@firma.com", "no-reply@firma.com", "logo@2x.png", "user@example.com", "name@domain.com", "a@b.c", "x..y@firma.com"]) {
      expect(isPlausibleEmail(cleanEmail(bad)), bad).toBe(false);
    }
    expect(isPlausibleEmail("ayse@firma.com.tr")).toBe(true);
  });
});

describe("decodeCfEmail", () => {
  it("gizli diziyi çözer", () => {
    expect(decodeCfEmail(cf("info@firma.com"))).toBe("info@firma.com");
    expect(decodeCfEmail("zz")).toBeNull();
  });
});

describe("classifyEmail / sameSite", () => {
  it("rol, kişisel ve iş adreslerini ayırır", () => {
    expect(classifyEmail("info@firma.com")).toBe("rol");
    expect(classifyEmail("i.letisim@firma.com")).toBe("rol");
    expect(classifyEmail("ayse@gmail.com")).toBe("kisisel");
    expect(classifyEmail("ayse.demir@firma.com")).toBe("is");
  });
  it("sitenin kendi alan adını (alt alan dahil) tanır", () => {
    expect(sameSite("a@firma.com", "www.firma.com")).toBe(true);
    expect(sameSite("a@mail.firma.com", "firma.com")).toBe(true);
    expect(sameSite("a@baska.com", "firma.com")).toBe(false);
  });
});

describe("rankCandidates", () => {
  it("kendi alan adındaki kişi adresini rol ve kişisel adreslerin önüne koyar", () => {
    const ranked = rankCandidates(
      [
        { email: "info@firma.com", via: "metin", sourceUrl: "https://firma.com/iletisim" },
        { email: "ayse@gmail.com", via: "mailto", sourceUrl: "https://firma.com" },
        { email: "ayse.demir@firma.com", via: "mailto", sourceUrl: "https://firma.com/ekip" },
      ],
      "www.firma.com",
    );
    expect(ranked.map((c) => c.email)).toEqual(["ayse.demir@firma.com", "info@firma.com", "ayse@gmail.com"]);
    expect(ranked[0]).toMatchObject({ kind: "is", sameSite: true });
  });
});

describe("pickContactLinks", () => {
  it("iletişim sayfasını önce seçer, dış siteleri ve varlıkları atlar", () => {
    const links = [
      { href: "/hakkimizda", text: "Hakkımızda" },
      { href: "/iletisim", text: "İletişim" },
      { href: "https://baska.com/contact", text: "Contact" },
      { href: "/katalog.pdf", text: "İletişim kataloğu" },
      { href: "/blog/x", text: "Blog" },
    ];
    expect(pickContactLinks(links, "https://www.firma.com/")).toEqual(["https://www.firma.com/iletisim", "https://www.firma.com/hakkimizda"]);
  });
});
