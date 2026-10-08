import { describe, expect, it } from "vitest";
import { detectChannels, extractPage, pickRelatedLinks } from "./extract";

const html = `<!doctype html><html><head>
<title>Anasayfa | Yıldız Mali Müşavirlik</title>
<meta name="description" content="Kadıköy&#39;de muhasebe ve vergi danışmanlığı.">
<meta property="og:site_name" content="Yıldız Mali Müşavirlik">
<script type="application/ld+json">{"@type":"AccountingService","name":"Yıldız Mali Müşavirlik","address":{"addressLocality":"Kadıköy","addressRegion":"İstanbul"},"telephone":"+90 216"}</script>
<script>var secret = "gizli";</script></head>
<body><nav><a href="/">Ana</a></nav>
<h1>Muhasebe &amp; Vergi</h1><p>Küçük işletmelere <b>aylık muhasebe</b> hizmeti.</p>
<a href="/hakkimizda">Hakkımızda</a><a href="/hizmetlerimiz/muhasebe">Hizmetlerimiz</a><a href="/blog/x">Blog</a>
<a href="https://other.com/hakkimizda">Dış</a>
<a href="tel:+90216">Ara</a><a href="https://wa.me/90555">WhatsApp</a><a href="https://www.instagram.com/yildizmm/">IG</a>
<footer>Telif</footer><script>alert(1)</script></body></html>`;

describe("extractPage", () => {
  const page = extractPage(html);

  it("başlık, açıklama ve site adını okur", () => {
    expect(page.title).toBe("Anasayfa | Yıldız Mali Müşavirlik");
    expect(page.description).toBe("Kadıköy'de muhasebe ve vergi danışmanlığı.");
    expect(page.siteName).toBe("Yıldız Mali Müşavirlik");
  });

  it("görünür metni çıkarır, betik ve gezinti/alt bilgiyi atar", () => {
    expect(page.text).toContain("aylık muhasebe hizmeti");
    expect(page.text).not.toContain("gizli");
    expect(page.text).not.toContain("alert");
    expect(page.text).not.toContain("Telif");
    expect(page.headings).toEqual(["Muhasebe & Vergi"]);
  });

  it("yapısal veriden tür, ad ve adresi alır", () => {
    expect(page.structured).toContain("AccountingService");
    expect(page.structured).toContain("Kadıköy, İstanbul");
  });
});

describe("pickRelatedLinks", () => {
  it("aynı siteden hakkında ve hizmet sayfalarını seçer", () => {
    const { links } = extractPage(html);
    expect(pickRelatedLinks(links, "https://www.firma.com/")).toEqual(["https://www.firma.com/hakkimizda", "https://www.firma.com/hizmetlerimiz/muhasebe"]);
  });
});

describe("detectChannels", () => {
  it("bağlantılardan iletişim kanallarını bulur", () => {
    expect(detectChannels(extractPage(html).links).sort()).toEqual(["instagram", "telefon", "whatsapp"]);
  });
});
