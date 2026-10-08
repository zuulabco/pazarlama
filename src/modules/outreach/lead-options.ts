import { z } from "zod";

/** "Kişi bul" arama seçenekleri ve doğrulaması (sunucu ve istemci ortak). Sağlayıcı değerleri İngilizce, etiketler Türkçedir. */

export const countryOptions = [
  { value: "turkey", label: "Türkiye" },
  { value: "germany", label: "Almanya" },
  { value: "united kingdom", label: "Birleşik Krallık" },
  { value: "united states", label: "ABD" },
  { value: "netherlands", label: "Hollanda" },
  { value: "france", label: "Fransa" },
  { value: "azerbaijan", label: "Azerbaycan" },
  { value: "united arab emirates", label: "Birleşik Arap Emirlikleri" },
  { value: "saudi arabia", label: "Suudi Arabistan" },
  { value: "italy", label: "İtalya" },
  { value: "spain", label: "İspanya" },
  { value: "canada", label: "Kanada" },
  { value: "australia", label: "Avustralya" },
] as const;

export const industryOptions = [
  { value: "Marketing & Advertising", label: "Pazarlama ve reklam" },
  { value: "Information Technology & Services", label: "Bilişim hizmetleri" },
  { value: "Computer Software", label: "Yazılım" },
  { value: "Internet", label: "İnternet" },
  { value: "Retail", label: "Perakende" },
  { value: "Consumer Goods", label: "Tüketim ürünleri" },
  { value: "Apparel & Fashion", label: "Moda ve giyim" },
  { value: "Restaurants", label: "Restoranlar" },
  { value: "Hospitality", label: "Otelcilik" },
  { value: "Leisure, Travel & Tourism", label: "Turizm ve seyahat" },
  { value: "Real Estate", label: "Gayrimenkul" },
  { value: "Construction", label: "İnşaat" },
  { value: "Architecture & Planning", label: "Mimarlık ve planlama" },
  { value: "Accounting", label: "Muhasebe" },
  { value: "Financial Services", label: "Finansal hizmetler" },
  { value: "Insurance", label: "Sigorta" },
  { value: "Banking", label: "Bankacılık" },
  { value: "Law Practice", label: "Hukuk bürosu" },
  { value: "Management Consulting", label: "Yönetim danışmanlığı" },
  { value: "Human Resources", label: "İnsan kaynakları" },
  { value: "Staffing & Recruiting", label: "İşe alım" },
  { value: "Higher Education", label: "Yükseköğretim" },
  { value: "Primary/Secondary Education", label: "Okullar" },
  { value: "E-Learning", label: "E-öğrenme" },
  { value: "Professional Training & Coaching", label: "Eğitim ve koçluk" },
  { value: "Hospital & Health Care", label: "Sağlık kuruluşları" },
  { value: "Medical Practice", label: "Muayenehane ve klinik" },
  { value: "Health, Wellness & Fitness", label: "Sağlık ve spor" },
  { value: "Pharmaceuticals", label: "İlaç" },
  { value: "Automotive", label: "Otomotiv" },
  { value: "Machinery", label: "Makine" },
  { value: "Electrical/Electronic Manufacturing", label: "Elektrik-elektronik üretim" },
  { value: "Food & Beverages", label: "Gıda ve içecek" },
  { value: "Textiles", label: "Tekstil" },
  { value: "Logistics & Supply Chain", label: "Lojistik ve tedarik zinciri" },
  { value: "Transportation/Trucking/Railroad", label: "Taşımacılık" },
  { value: "Import & Export", label: "İthalat ve ihracat" },
  { value: "Wholesale", label: "Toptan satış" },
  { value: "Oil & Energy", label: "Enerji" },
  { value: "Renewables & Environment", label: "Yenilenebilir enerji ve çevre" },
  { value: "Telecommunications", label: "Telekomünikasyon" },
  { value: "Media Production", label: "Medya yapımı" },
  { value: "Events Services", label: "Etkinlik hizmetleri" },
  { value: "Design", label: "Tasarım" },
  { value: "Graphic Design", label: "Grafik tasarım" },
  { value: "Nonprofit Organization Management", label: "Dernek ve vakıflar" },
] as const;

export const sizeOptions = [
  { value: "1-10", label: "1-10 çalışan" },
  { value: "11-20", label: "11-20" },
  { value: "21-50", label: "21-50" },
  { value: "51-100", label: "51-100" },
  { value: "101-200", label: "101-200" },
  { value: "201-500", label: "201-500" },
  { value: "501-1000", label: "501-1.000" },
  { value: "1001-2000", label: "1.001-2.000" },
  { value: "2001-5000", label: "2.001-5.000" },
  { value: "5001-10000", label: "5.001-10.000" },
  { value: "10001+", label: "10.000+" },
] as const;

/**
 * Kişi türleri: tek tıkla bir grup unvanı (Türkçe ve İngilizce) arar. Apollo/Instantly'deki "kıdem" ve "departman" süzgeçlerinin karşılığı;
 * her grup yönetici düzeyindeki unvanları kapsar, böylece "Marketing" aramasındaki stajyer/uzman gürültüsü gelmez.
 */
export const roleOptions = [
  { value: "sahip", label: "Kurucu ve sahipler", titles: ["Founder", "Co-Founder", "Owner", "Kurucu", "Sahibi", "Ortak"] },
  { value: "ust", label: "CEO ve genel müdürler", titles: ["CEO", "Chief Executive", "Managing Director", "General Manager", "Genel Müdür", "Başkan", "President"] },
  { value: "pazarlama", label: "Pazarlama yöneticileri", titles: ["Marketing Manager", "Marketing Director", "Head of Marketing", "CMO", "Pazarlama Müdürü", "Pazarlama Direktörü", "Pazarlama Yöneticisi"] },
  { value: "satis", label: "Satış yöneticileri", titles: ["Sales Manager", "Sales Director", "Head of Sales", "VP Sales", "Satış Müdürü", "Satış Direktörü", "Satış Yöneticisi"] },
  { value: "satinalma", label: "Satın alma yöneticileri", titles: ["Procurement Manager", "Purchasing Manager", "Head of Procurement", "Satın Alma Müdürü", "Satın Alma Yöneticisi"] },
  { value: "ik", label: "İnsan kaynakları", titles: ["HR Manager", "Human Resources Manager", "Head of HR", "İnsan Kaynakları Müdürü", "İK Müdürü"] },
  { value: "finans", label: "Finans ve muhasebe", titles: ["CFO", "Finance Manager", "Finance Director", "Accounting Manager", "Finans Müdürü", "Mali İşler", "Muhasebe Müdürü"] },
  { value: "bt", label: "BT ve teknoloji", titles: ["CTO", "IT Manager", "Head of IT", "Bilgi Teknolojileri", "BT Müdürü"] },
  { value: "operasyon", label: "Operasyon ve lojistik", titles: ["Operations Manager", "COO", "Logistics Manager", "Operasyon Müdürü", "Lojistik Müdürü"] },
] as const;

/** "Stajyer ve asistanları hariç tut" seçeneğinin eklediği unvanlar. */
export const juniorTitles = ["Intern", "Stajyer", "Assistant", "Asistan", "Student"] as const;

/** Hızlı eklenen unvanlar. Veritabanında unvanlar hem Türkçe hem İngilizce geçtiği için ikisi de önerilir. */
export const titleSuggestions = ["CEO", "Founder", "Owner", "Genel Müdür", "Kurucu", "Pazarlama Müdürü", "Marketing Manager", "Satış Müdürü", "Sales Manager", "Satın Alma", "İnsan Kaynakları", "Finans Müdürü", "CTO"] as const;

export const countChoices = [10, 25, 50, 100, 200] as const;

const tag = (max: number) => z.string().trim().min(2, "Çok kısa.").max(max, `En fazla ${max} karakter.`);
const oneOf = <T extends readonly { value: string }[]>(list: T) => z.enum(list.map((o) => o.value) as [string, ...string[]]);

export const leadSearchSchema = z
  .object({
  /** Kişi türleri (kıdem/departman grupları). Hiçbiri seçilmezse unvan koşulu olmaz. */
  roles: z.array(oneOf(roleOptions)).max(9).default([]),
  /** Ek olarak elle yazılan unvanlar. */
  titles: z.array(tag(60)).max(8, "En fazla 8 unvan.").default([]),
  notTitles: z.array(tag(60)).max(8).default([]),
  /** Stajyer ve asistan unvanlarını hariç tut. */
  excludeJunior: z.boolean().default(true),
  /** Aynı şirketten en çok kaç kişi (0 = sınırsız). */
  perCompany: z.number().int().min(0).max(5).default(1),
  country: oneOf(countryOptions),
  /** Verilirse yalnızca bu şehirdeki kişiler aranır (ülke yerine). */
  city: z.string().trim().max(60).optional().transform((v) => v || undefined),
  industries: z.array(oneOf(industryOptions)).max(6).default([]),
  sizes: z.array(oneOf(sizeOptions)).max(5).default([]),
  keywords: z.array(tag(40)).max(5).default([]),
  notKeywords: z.array(tag(40)).max(5).default([]),
  count: z.number().int().min(5, "En az 5 kişi.").max(500, "En çok 500 kişi."),
  })
  .refine((q) => q.roles.length + q.titles.length + q.industries.length + q.keywords.length > 0, {
    message: "Kişi türü, unvan, sektör ya da anahtar kelimeden en az birini seçin.",
    path: ["roles"],
  });

export type LeadSearchInput = z.infer<typeof leadSearchSchema>;

/** Seçilen kişi türleri ve elle yazılan unvanlardan sağlayıcıya gidecek benzersiz unvan listesi. */
export function expandTitles(q: Pick<LeadSearchInput, "roles" | "titles">): string[] {
  const out = new Map<string, string>();
  for (const r of q.roles) for (const t of roleOptions.find((o) => o.value === r)?.titles ?? []) out.set(t.toLowerCase(), t);
  for (const t of q.titles) out.set(t.toLowerCase(), t);
  return [...out.values()];
}

/** Hariç tutulacak unvanlar (elle yazılanlar + isteğe bağlı stajyer/asistan). */
export function expandNotTitles(q: Pick<LeadSearchInput, "notTitles" | "excludeJunior">): string[] {
  const out = new Map<string, string>();
  for (const t of [...q.notTitles, ...(q.excludeJunior ? juniorTitles : [])]) out.set(t.toLowerCase(), t);
  return [...out.values()];
}

export type LeadJobStatus = "calisiyor" | "aktariliyor" | "bitti" | "hata";

export type LeadJob = {
  id: string;
  status: LeadJobStatus;
  requested: number;
  found: number;
  added: number;
  refunded: number;
  skipped: { yinelenen?: number; ayni_sirket?: number; epostasiz?: number; gecersiz?: number; kara_liste?: number; kisi_siniri?: number };
  listName: string | null;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};

export const skippedLabels: Record<keyof LeadJob["skipped"], string> = {
  yinelenen: "zaten kayıtlı",
  ayni_sirket: "aynı şirketten fazla kişi",
  epostasiz: "e-postası yok",
  gecersiz: "geçersiz e-posta",
  kara_liste: "kara listede",
  kisi_siniri: "kişi sınırı doldu",
};

/** Hazır aramalar: tek tıkla süzgeçleri doldurur. */
export type LeadPreset = { id: string; label: string; hint: string; query: Partial<Pick<LeadSearchInput, "roles" | "titles" | "notTitles" | "country" | "city" | "industries" | "sizes" | "keywords">> };

export const leadPresets: LeadPreset[] = [
  { id: "pazarlama", label: "Pazarlama yöneticileri", hint: "Türkiye · her sektörden", query: { roles: ["pazarlama"], country: "turkey" } },
  { id: "kurucu-kobi", label: "Küçük işletme kurucuları", hint: "Türkiye · 1-50 çalışan", query: { roles: ["sahip"], country: "turkey", sizes: ["1-10", "11-20", "21-50"] } },
  { id: "eticaret", label: "E-ticaret şirketlerinin yöneticileri", hint: "Türkiye · e-ticaret", query: { roles: ["sahip", "ust"], country: "turkey", keywords: ["e-commerce"] } },
  { id: "otel", label: "Otel ve restoran sahipleri", hint: "Türkiye · otelcilik, restoran", query: { roles: ["sahip", "ust"], country: "turkey", industries: ["Hospitality", "Restaurants"] } },
  { id: "yazilim", label: "Yazılım şirketi CEO'ları", hint: "Türkiye · yazılım ve bilişim", query: { roles: ["sahip", "ust"], country: "turkey", industries: ["Computer Software", "Information Technology & Services"] } },
  { id: "istanbul-ceo", label: "İstanbul'daki üst yöneticiler", hint: "İstanbul · CEO ve genel müdürler", query: { roles: ["ust"], country: "turkey", city: "İstanbul" } },
];

export const emptySearch = (): LeadSearchInput => ({ roles: [], titles: [], notTitles: [], excludeJunior: true, perCompany: 1, country: "turkey", city: undefined, industries: [], sizes: [], keywords: [], notKeywords: [], count: 25 });

/** "Ayşe Demir" → "Ayşe D." (önizlemede soyadı kısaltılır). */
export const shortName = (name: string | null) => {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0]} ${parts.at(-1)![0]}.` : (parts[0] ?? "Kişi");
};

// ─── Kişi bul v2: listeleme (kredi harcamadan) ve seçilenleri ekleme ─────────────────────────────

/** Listelenecek kişi sayısı seçenekleri. */
export const browseSizes = [10, 25, 50, 100, 200] as const;

/** Listeleme sonucundaki bir satır: soyadı, e-posta ve LinkedIn gizlidir; kişi eklenince açılır. */
export type BrowseRow = { rid: number; name: string; jobTitle: string | null; company: string | null; location: string | null; owned: boolean };

export type LeadBrowse = {
  id: string;
  status: "calisiyor" | "hazir" | "hata";
  size: number;
  found: number;
  rows: BrowseRow[];
  hidden: { owned: number; sameCompany: number };
  error: string | null;
  query: LeadSearchInput;
  createdAt: string;
};

export type SavedSearch = { id: string; name: string; query: LeadSearchInput; createdAt: string };

/** Unvan seçicideki öneriler (yazdıkça süzülür; listede olmayan unvan da yazılıp eklenebilir). Türkçe ve İngilizce karışık: veritabanında ikisi de geçer. */
export const titleDictionary: readonly string[] = [
  "CEO", "Founder", "Co-Founder", "Owner", "Managing Director", "General Manager", "President", "Chairman", "Partner",
  "Genel Müdür", "Genel Müdür Yardımcısı", "Kurucu", "Kurucu Ortak", "Yönetim Kurulu Başkanı", "İşletme Sahibi", "Şirket Sahibi", "Ortak", "İcra Kurulu Başkanı",
  "CMO", "Chief Marketing Officer", "Marketing Manager", "Marketing Director", "Head of Marketing", "VP Marketing", "Digital Marketing Manager", "Brand Manager", "Growth Manager", "Content Manager", "Social Media Manager", "Performance Marketing Manager", "E-commerce Manager",
  "Pazarlama Müdürü", "Pazarlama Direktörü", "Pazarlama Yöneticisi", "Dijital Pazarlama Müdürü", "Marka Müdürü", "Sosyal Medya Yöneticisi", "E-ticaret Müdürü", "İçerik Müdürü",
  "Sales Manager", "Sales Director", "Head of Sales", "VP Sales", "Business Development Manager", "Account Manager", "Key Account Manager", "Export Manager", "Regional Sales Manager",
  "Satış Müdürü", "Satış Direktörü", "Satış Yöneticisi", "İş Geliştirme Müdürü", "Müşteri Yöneticisi", "İhracat Müdürü", "Bölge Satış Müdürü",
  "COO", "Operations Manager", "Operations Director", "Logistics Manager", "Supply Chain Manager", "Production Manager", "Plant Manager", "Quality Manager",
  "Operasyon Müdürü", "Lojistik Müdürü", "Tedarik Zinciri Müdürü", "Üretim Müdürü", "Fabrika Müdürü", "Kalite Müdürü",
  "CFO", "Finance Manager", "Finance Director", "Accounting Manager", "Controller", "Financial Controller",
  "Finans Müdürü", "Mali İşler Müdürü", "Muhasebe Müdürü", "Finans Direktörü",
  "CTO", "CIO", "IT Manager", "IT Director", "Head of IT", "Head of Engineering", "Engineering Manager", "Software Development Manager", "Product Manager", "Head of Product",
  "Bilgi Teknolojileri Müdürü", "BT Müdürü", "Yazılım Müdürü", "Ürün Müdürü", "Teknoloji Direktörü",
  "HR Manager", "Human Resources Manager", "HR Director", "Head of HR", "Talent Acquisition Manager", "Recruiter",
  "İnsan Kaynakları Müdürü", "İK Müdürü", "İnsan Kaynakları Direktörü", "İşe Alım Uzmanı",
  "Procurement Manager", "Purchasing Manager", "Head of Procurement", "Buyer", "Satın Alma Müdürü", "Satın Alma Yöneticisi", "Satın Alma Uzmanı",
  "Customer Success Manager", "Customer Service Manager", "Müşteri Hizmetleri Müdürü", "Müşteri Deneyimi Müdürü",
  "Store Manager", "Mağaza Müdürü", "Branch Manager", "Şube Müdürü", "Restaurant Manager", "Restoran Müdürü", "Hotel Manager", "Otel Müdürü", "Front Office Manager",
  "Architect", "Mimar", "Engineer", "Mühendis", "Doctor", "Doktor", "Lawyer", "Avukat", "Accountant", "Mali Müşavir", "Consultant", "Danışman",
] as const;
