import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { decryptSecret, encryptSecret, signToken, verifyToken, CryptoConfigError } = await import("./crypto");

beforeAll(() => {
  process.env.OUTREACH_ENC_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("encryptSecret / decryptSecret", () => {
  it("gidiş-dönüşte aynı metni verir, her seferinde farklı şifreli çıktı üretir", () => {
    const a = encryptSecret("uygulama şifresi 123");
    const b = encryptSecret("uygulama şifresi 123");
    expect(a).not.toBe(b);
    expect(a).not.toContain("uygulama");
    expect(decryptSecret(a)).toBe("uygulama şifresi 123");
  });
  it("kurcalanmış ya da bozuk veriyi reddeder", () => {
    const t = encryptSecret("gizli");
    const parts = t.split(".");
    expect(() => decryptSecret([parts[0], parts[1], parts[2], Buffer.from("x").toString("base64url")].join("."))).toThrow();
    expect(() => decryptSecret("rastgele")).toThrow();
  });
  it("yanlış anahtarla çözülemez", () => {
    const t = encryptSecret("gizli");
    process.env.OUTREACH_ENC_KEY = Buffer.alloc(32, 9).toString("base64");
    expect(() => decryptSecret(t)).toThrow();
    process.env.OUTREACH_ENC_KEY = Buffer.alloc(32, 7).toString("base64");
  });
  it("anahtar yoksa ya da kısaysa net hata verir", () => {
    const saved = process.env.OUTREACH_ENC_KEY;
    process.env.OUTREACH_ENC_KEY = "kisa";
    expect(() => encryptSecret("x")).toThrow(CryptoConfigError);
    process.env.OUTREACH_ENC_KEY = saved;
  });
});

describe("signToken / verifyToken", () => {
  it("imzayı doğrular ve yükü geri verir", () => {
    expect(verifyToken(signToken("unsub:abc"))).toBe("unsub:abc");
  });
  it("değiştirilmiş yükü ya da imzayı reddeder", () => {
    const t = signToken("unsub:abc");
    const [body, sig] = t.split(".");
    expect(verifyToken(`${Buffer.from("unsub:xyz").toString("base64url")}.${sig}`)).toBeNull();
    expect(verifyToken(`${body}.${sig.slice(0, -2)}AA`)).toBeNull();
    expect(verifyToken("saçma")).toBeNull();
  });
});

describe("kısa abonelik jetonu", () => {
  const id = "3f2b8c1e-5a4d-4e7f-9b21-0c6d7e8f9a10";
  it("34 karakterdir, doğrulanınca kimliği verir; kurcalanırsa reddedilir", async () => {
    const { shortEnrollmentToken, verifyShortEnrollmentToken } = await import("./crypto");
    const t = shortEnrollmentToken(id);
    expect(t).toHaveLength(34);
    expect(verifyShortEnrollmentToken(t)).toBe(id);
    expect(verifyShortEnrollmentToken(t.slice(0, -1) + (t.endsWith("A") ? "B" : "A"))).toBeNull();
    expect(verifyShortEnrollmentToken("kisa")).toBeNull();
    expect(verifyShortEnrollmentToken(signToken(`e:${id}`))).toBeNull();
  });
});
