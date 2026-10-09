import { describe, expect, it } from "vitest";
import { ensureHttps } from "./links";

describe("ensureHttps", () => {
  it("başında https olmayan adreslere https ekler", () => {
    expect(ensureHttps("Sitemiz adspine.app adresinde.")).toBe("Sitemiz https://adspine.app adresinde.");
    expect(ensureHttps("www.firma.com.tr/teklif sayfasına bakın.")).toBe("https://www.firma.com.tr/teklif sayfasına bakın.");
    expect(ensureHttps("Bakın: adspine.app, sonra yazın.")).toBe("Bakın: https://adspine.app, sonra yazın.");
    expect(ensureHttps("(adspine.app/demo?x=1).")).toBe("(https://adspine.app/demo?x=1).");
  });
  it("tam bağlantılara, e-posta adreslerine ve sıradan metne dokunmaz", () => {
    expect(ensureHttps("https://adspine.app ve http://a.com/x")).toBe("https://adspine.app ve http://a.com/x");
    expect(ensureHttps("info@adspine.app adresine yazın")).toBe("info@adspine.app adresine yazın");
    expect(ensureHttps("Ör.ek cümle. Örn.sonra başka.")).toBe("Ör.ek cümle. Örn.sonra başka.");
    expect(ensureHttps("Saat 14.30'da görüşelim.")).toBe("Saat 14.30'da görüşelim.");
  });
});
