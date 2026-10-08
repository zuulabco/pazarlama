import { describe, expect, it } from "vitest";
import { analyzeDns, isManagedDomain } from "./dns-health";
import { guessProvider, presetFor, providerFromMx } from "./presets";

const facts = (over: Partial<Parameters<typeof analyzeDns>[2]> = {}) => ({ spf: [], dmarc: [], dkimFound: [], mx: [], ...over });
const status = (r: ReturnType<typeof analyzeDns>, key: string) => r.checks.find((c) => c.key === key)?.status;

describe("analyzeDns", () => {
  it("hiçbir kayıt yoksa SPF/DKIM/DMARC/MX eksik, hazır değil ve eklenecek kayıtları söyler", () => {
    const r = analyzeDns("firma.com", "gmail", facts());
    expect(r.ready).toBe(false);
    expect(["spf", "dkim", "dmarc", "mx"].map((k) => status(r, k))).toEqual(["eksik", "eksik", "eksik", "eksik"]);
    expect(r.checks[0].fix).toEqual({ type: "TXT", host: "@", value: "v=spf1 include:_spf.google.com ~all" });
    expect(r.checks.find((c) => c.key === "dmarc")?.fix).toEqual({ type: "TXT", host: "_dmarc", value: "v=DMARC1; p=none;" });
  });

  it("her şey yerindeyse hazırdır", () => {
    const r = analyzeDns("firma.com", "gmail", facts({ spf: ["v=spf1 include:_spf.google.com ~all"], dmarc: ["v=DMARC1; p=none; rua=mailto:a@firma.com"], dkimFound: ["google"], mx: ["aspmx.l.google.com"] }));
    expect(r.ready).toBe(true);
    expect(r.checks.every((c) => c.status === "ok")).toBe(true);
  });

  it("SPF'te sağlayıcı yoksa, birden fazla ya da +all ise uyarır", () => {
    expect(status(analyzeDns("f.com", "gmail", facts({ spf: ["v=spf1 include:baska.com ~all"] })), "spf")).toBe("uyari");
    expect(status(analyzeDns("f.com", "gmail", facts({ spf: ["v=spf1 a ~all", "v=spf1 mx ~all"] })), "spf")).toBe("uyari");
    expect(status(analyzeDns("f.com", "outlook", facts({ spf: ["v=spf1 include:spf.protection.outlook.com +all"] })), "spf")).toBe("uyari");
    expect(analyzeDns("f.com", "gmail", facts({ spf: ["v=spf1 include:baska.com ~all"] })).checks[0].fix?.value).toContain("include:_spf.google.com");
  });

  it("Microsoft için DKIM CNAME yönlendirmesi anlatır", () => {
    const r = analyzeDns("f.com", "outlook", facts());
    expect(r.checks.find((c) => c.key === "dkim")?.detail).toContain("selector1._domainkey");
  });

  it("ücretsiz posta adreslerinde DNS'i sağlayıcıya ait sayar", () => {
    expect(isManagedDomain("Gmail.com")).toBe(true);
    const r = analyzeDns("gmail.com", "gmail", facts());
    expect(r).toMatchObject({ managed: true, ready: true });
  });
});

describe("presets", () => {
  it("alan adından ve MX'ten sağlayıcıyı bulur", () => {
    expect(guessProvider("a@gmail.com")).toBe("gmail");
    expect(guessProvider("a@hotmail.com")).toBe("outlook");
    expect(guessProvider("a@firma.com")).toBeNull();
    expect(providerFromMx(["aspmx.l.google.com", "alt1.aspmx.l.google.com"])).toBe("gmail");
    expect(providerFromMx(["firma-com.mail.protection.outlook.com"])).toBe("outlook");
    expect(providerFromMx(["mail.firma.com"])).toBeNull();
  });
  it("sunucu ön ayarlarını verir (Outlook kişisel ve 365 farklı)", () => {
    expect(presetFor("gmail", "a@firma.com")).toEqual({ smtp: { host: "smtp.gmail.com", port: 465, secure: true }, imap: { host: "imap.gmail.com", port: 993, secure: true } });
    expect(presetFor("outlook", "a@hotmail.com").smtp.host).toBe("smtp-mail.outlook.com");
    expect(presetFor("outlook", "a@firma.com").smtp).toEqual({ host: "smtp.office365.com", port: 587, secure: false });
    expect(presetFor("ozel", "a@firma.com").smtp.host).toBe("smtp.firma.com");
  });
});
