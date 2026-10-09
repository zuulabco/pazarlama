import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { poolable, emailHash, RETENTION_DAYS } = await import("./lead-pool");

describe("kişi havuzu kuralları", () => {
  it("yalnızca şirket alan adlı adresler havuza girer; kişisel adresler girmez", () => {
    expect(poolable("ayse.demir@lale.com.tr")).toBe(true);
    expect(poolable("info@lale.com.tr")).toBe(true);
    expect(poolable("ayse@gmail.com")).toBe(false);
    expect(poolable("ali@hotmail.com")).toBe(false);
    expect(poolable("veli@outlook.com")).toBe(false);
  });
  it("e-posta özeti büyük/küçük harf ve boşluğa duyarsızdır", () => {
    expect(emailHash(" Ayse@Lale.com ")).toBe(emailHash("ayse@lale.com"));
    expect(emailHash("ayse@lale.com")).toMatch(/^[a-f0-9]{64}$/);
  });
  it("saklama süresi 24 aydır", () => {
    expect(RETENTION_DAYS).toBe(730);
  });
});
