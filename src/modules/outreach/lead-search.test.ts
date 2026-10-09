import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ db: () => ({}) }));

const { buildActorInput, estimateUsd, mapLead } = await import("./lead-search");
const { expandKeywords, expandNotTitles, expandTitles, leadSearchSchema, resolveTitle } = await import("./lead-options");
const { monthlyCapacity, planOf, plans } = await import("./plans");

const base = { titles: ["CEO"], country: "turkey", count: 25 };

describe("kişi bul: sağlayıcı girdisi", () => {
  it("yalnızca doğrulanmış e-posta ister, cep telefonu istemez", () => {
    const input = buildActorInput(leadSearchSchema.parse(base));
    expect(input).toMatchObject({ max_result: 25, include_mobile: false, email_status: ["verified"], contact_job_titles: ["CEO", "Chief Executive Officer"], contact_location: ["turkey"] });
    // Varsayılan olarak stajyer ve asistanlar hariç tutulur.
    expect(input.contact_job_not_titles).toEqual(["Intern", "Stajyer", "Assistant", "Asistan", "Student"]);
    expect(input).not.toHaveProperty("company_industry");
  });
  it("şehir verilirse ülke yerine yalnızca şehirle arar", () => {
    const input = buildActorInput(leadSearchSchema.parse({ ...base, city: " İstanbul " }));
    expect(input.contact_location).toEqual(["istanbul"]);
  });
  it("sektör, büyüklük, anahtar kelime ve hariç tutmaları ekler", () => {
    const input = buildActorInput(leadSearchSchema.parse({ ...base, excludeJunior: false, notTitles: ["Product"], industries: ["Retail"], sizes: ["1-10"], keywords: ["moda"], notKeywords: ["toptan"] }));
    expect(input).toMatchObject({ company_industry: ["Retail"], company_num_employees_range: ["1-10"], keywords: ["moda"], not_keywords: ["toptan"] });
  });
  it("maliyet tahmini başlangıç ücreti + kayıt başına ücrettir", () => {
    expect(estimateUsd(100)).toBeCloseTo(0.301);
  });
});

describe("kişi bul: doğrulama", () => {
  it("unvan zorunlu değil ama bir daraltıcı gerekir; geçersiz ülke/sektör/sayı reddedilir", () => {
    expect(leadSearchSchema.safeParse({ ...base, titles: [] }).success).toBe(false);
    expect(leadSearchSchema.safeParse({ ...base, titles: [], industries: ["Retail"] }).success).toBe(true);
    expect(leadSearchSchema.safeParse({ ...base, titles: [], roles: ["pazarlama"] }).success).toBe(true);
    expect(leadSearchSchema.safeParse({ ...base, titles: [], keywords: ["moda"] }).success).toBe(true);
    expect(leadSearchSchema.safeParse({ ...base, country: "atlantis" }).success).toBe(false);
    expect(leadSearchSchema.safeParse({ ...base, industries: ["Nope"] }).success).toBe(false);
    expect(leadSearchSchema.safeParse({ ...base, count: 2 }).success).toBe(false);
    expect(leadSearchSchema.safeParse({ ...base, count: 501 }).success).toBe(false);
    expect(leadSearchSchema.safeParse(base).success).toBe(true);
  });
});

describe("kişi bul: kayıt eşleme", () => {
  it("sağlayıcı kaydını kişi alanlarına çevirir", () => {
    expect(
      mapLead({ first_name: "Ayşe", last_name: "Demir", email: "AYSE@Firma.com.tr ", organization_name: "Firma A.Ş.", organization_primary_domain: "firma.com.tr", city: "Istanbul", state: "Istanbul", title: "Pazarlama Müdürü", linkedin_url: "https://linkedin.com/in/x" }),
    ).toEqual({ name: "Ayşe Demir", company: "Firma A.Ş.", email: "ayse@firma.com.tr", website: "https://firma.com.tr", city: "Istanbul", jobTitle: "Pazarlama Müdürü", linkedinUrl: "https://linkedin.com/in/x" });
  });
  it("e-postası olmayan kaydı atlar", () => {
    expect(mapLead({ first_name: "X", email: null })).toBeNull();
    expect(mapLead({ first_name: "X", email: "  " })).toBeNull();
  });
});

describe("paketler", () => {
  it("gönderim kapasitesi gönderici adresi sayısıyla orantılıdır", () => {
    expect(monthlyCapacity(plans.ajans)).toBe(20 * 30 * 22);
    expect(monthlyCapacity(plans.ajans)).toBeGreaterThan(monthlyCapacity(plans.buyume));
    expect(monthlyCapacity(plans.buyume)).toBeGreaterThan(monthlyCapacity(plans.ucretsiz));
  });
  it("bilinmeyen paket ücretsiz sayılır", () => {
    expect(planOf("x").key).toBe("ucretsiz");
    expect(planOf(null).key).toBe("ucretsiz");
    expect(planOf("buyume").senders).toBe(10);
  });
});

describe("kişi türleri", () => {
  it("seçilen türleri ve elle yazılanları benzersiz unvan listesine çevirir", () => {
    const titles = expandTitles({ roles: ["sahip", "pazarlama"], titles: ["founder", "Mağaza Müdürü"] });
    expect(titles).toContain("Pazarlama Müdürü");
    expect(titles).toContain("Marketing Manager");
    expect(titles.filter((t) => t.toLowerCase() === "founder")).toHaveLength(1);
    expect(titles).toContain("Mağaza Müdürü");
  });
  it("unvansız aramada sağlayıcıya unvan koşulu gönderilmez", () => {
    const input = buildActorInput(leadSearchSchema.parse({ country: "turkey", count: 10, industries: ["Retail"] }));
    expect(input).not.toHaveProperty("contact_job_titles");
    expect(input).toMatchObject({ company_industry: ["Retail"] });
  });
  it("stajyer hariç tutma kapatılabilir ve hariç unvanlarla birleşir", () => {
    expect(expandNotTitles({ notTitles: ["Product"], excludeJunior: false })).toEqual(["Product"]);
    expect(expandNotTitles({ notTitles: ["Product"], excludeJunior: true })).toContain("Intern");
  });
  it("şirket başına varsayılan 1 kişidir", () => {
    expect(leadSearchSchema.parse(base).perCompany).toBe(1);
  });
});

describe("unvan ve kelime sözlüğü (Türkçe ↔ İngilizce)", () => {
  it("Türkçe seçilen unvan sağlayıcıya iki dilde gider", () => {
    expect(resolveTitle("Pazarlama Müdürü")).toEqual(["Pazarlama Müdürü", "Marketing Manager"]);
    expect(expandTitles({ roles: [], titles: ["Genel Müdür"] })).toEqual(expect.arrayContaining(["Genel Müdür", "General Manager", "Managing Director"]));
  });
  it("İngilizce yazılan unvan da sözlükle eşleşir; sözlükte olmayan olduğu gibi gider", () => {
    expect(resolveTitle("marketing manager")).toContain("Pazarlama Müdürü");
    expect(resolveTitle("Mağaza Sorumlusu")).toEqual(["Mağaza Sorumlusu"]);
  });
  it("hariç tutulan unvanlar da iki dilde genişler", () => {
    expect(expandNotTitles({ notTitles: ["Mimar"], excludeJunior: false })).toEqual(["Mimar", "Architect"]);
  });
  it("anahtar kelimeler sağlayıcının diline çevrilir, tekrarsızdır", () => {
    expect(expandKeywords(["e-ticaret", "E-Commerce", "yazılım", "boya"])).toEqual(["e-commerce", "software", "boya"]);
  });
});
