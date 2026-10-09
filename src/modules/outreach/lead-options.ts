import { z } from "zod";
import { fold } from "@/lib/text";

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
 * Kişi türleri: tek tıkla bir grup unvanı (Türkçe ve İngilizce) arar. Apollo/Instantly'deki "kıdem" ve "departman" filtrelerinin karşılığı;
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

/**
 * Unvan sözlüğü: kullanıcıya yalnızca Türkçe adı gösterilir; sağlayıcıya (İngilizce ağırlıklı veritabanı) Türkçe ve İngilizce karşılıkları
 * birlikte gider. Kullanıcı İngilizce yazarsa da eşleşir ("marketing manager" → "Pazarlama Müdürü").
 */
export type TitleEntry = { tr: string; en: readonly string[] };
const T = (tr: string, ...en: string[]): TitleEntry => ({ tr, en });
export const titleCatalog: readonly TitleEntry[] = [
  T("Kurucu", "Founder"), T("Kurucu Ortak", "Co-Founder"), T("İşletme Sahibi", "Owner", "Business Owner"), T("Ortak", "Partner"),
  T("CEO", "CEO", "Chief Executive Officer"), T("Genel Müdür", "General Manager", "Managing Director"), T("Genel Müdür Yardımcısı", "Deputy General Manager", "Assistant General Manager"),
  T("Yönetim Kurulu Başkanı", "Chairman"), T("Başkan", "President"),
  T("Pazarlama Müdürü", "Marketing Manager"), T("Pazarlama Direktörü", "Marketing Director", "Head of Marketing"), T("CMO", "CMO", "Chief Marketing Officer"),
  T("Dijital Pazarlama Müdürü", "Digital Marketing Manager"), T("Marka Müdürü", "Brand Manager"), T("Sosyal Medya Yöneticisi", "Social Media Manager"),
  T("E-ticaret Müdürü", "E-commerce Manager"), T("İçerik Müdürü", "Content Manager"), T("Büyüme Müdürü", "Growth Manager"),
  T("Satış Müdürü", "Sales Manager"), T("Satış Direktörü", "Sales Director", "Head of Sales"), T("İş Geliştirme Müdürü", "Business Development Manager"),
  T("Müşteri Yöneticisi", "Account Manager"), T("İhracat Müdürü", "Export Manager"), T("Bölge Satış Müdürü", "Regional Sales Manager"),
  T("Operasyon Müdürü", "Operations Manager"), T("COO", "COO", "Chief Operating Officer"), T("Lojistik Müdürü", "Logistics Manager"),
  T("Tedarik Zinciri Müdürü", "Supply Chain Manager"), T("Üretim Müdürü", "Production Manager"), T("Fabrika Müdürü", "Plant Manager"), T("Kalite Müdürü", "Quality Manager"),
  T("Finans Müdürü", "Finance Manager"), T("Finans Direktörü", "Finance Director"), T("CFO", "CFO", "Chief Financial Officer"),
  T("Muhasebe Müdürü", "Accounting Manager"), T("Mali İşler Müdürü", "Financial Controller", "Controller"),
  T("BT Müdürü", "IT Manager", "Head of IT"), T("CTO", "CTO", "Chief Technology Officer"), T("Yazılım Müdürü", "Software Development Manager", "Engineering Manager"), T("Ürün Müdürü", "Product Manager"),
  T("İnsan Kaynakları Müdürü", "HR Manager", "Human Resources Manager"), T("İnsan Kaynakları Direktörü", "HR Director", "Head of HR"), T("İşe Alım Uzmanı", "Recruiter", "Talent Acquisition Specialist"),
  T("Satın Alma Müdürü", "Procurement Manager", "Purchasing Manager"), T("Satın Alma Uzmanı", "Buyer", "Procurement Specialist"),
  T("Müşteri Hizmetleri Müdürü", "Customer Service Manager"), T("Mağaza Müdürü", "Store Manager"), T("Şube Müdürü", "Branch Manager"),
  T("Restoran Müdürü", "Restaurant Manager"), T("Otel Müdürü", "Hotel Manager"),
  T("Diş Hekimi", "Dentist"), T("Veteriner", "Veterinarian"), T("Eczacı", "Pharmacist"), T("Psikolog", "Psychologist"), T("Fizyoterapist", "Physiotherapist"), T("Mimar", "Architect"), T("Mühendis", "Engineer"), T("Doktor", "Doctor"), T("Avukat", "Lawyer"), T("Mali Müşavir", "Accountant"), T("Danışman", "Consultant"),
];

const titleIndex = new Map<string, TitleEntry>();
for (const e of titleCatalog) for (const name of [e.tr, ...e.en]) titleIndex.set(fold(name), e);

/** Bir unvanın sağlayıcıya gidecek karşılıkları: sözlükte varsa Türkçe + İngilizce adlar, yoksa yazıldığı gibi. */
export const resolveTitle = (t: string): string[] => {
  const e = titleIndex.get(fold(t.trim()));
  return e ? [e.tr, ...e.en] : [t.trim()];
};

/** Anahtar kelime sözlüğü (şirketin faaliyet alanı): Türkçe gösterilir, sağlayıcıya İngilizcesi gider. */
const K = (tr: string, en: string) => ({ tr, en });
export const keywordCatalog = [
  K("e-ticaret", "e-commerce"), K("restoran", "restaurant"), K("otel", "hotel"), K("yazılım", "software"), K("ajans", "agency"), K("klinik", "clinic"),
  K("diş", "dental"), K("güzellik", "beauty"), K("emlak", "real estate"), K("inşaat", "construction"), K("tekstil", "textile"), K("lojistik", "logistics"),
  K("eğitim", "education"), K("sağlık", "healthcare"), K("turizm", "tourism"), K("gıda", "food"), K("otomotiv", "automotive"), K("mobilya", "furniture"),
  K("finans", "finance"), K("sigorta", "insurance"), K("danışmanlık", "consulting"), K("tasarım", "design"), K("reklam", "advertising"), K("medya", "media"),
  K("üretim", "manufacturing"), K("enerji", "energy"), K("spor", "sports"), K("perakende", "retail"), K("kozmetik", "cosmetics"), K("tarım", "agriculture"),
] as const;
const keywordIndex = new Map<string, string>();
for (const k of keywordCatalog) {
  keywordIndex.set(fold(k.tr), k.en);
  keywordIndex.set(fold(k.en), k.en);
}
/** Kelimeleri sağlayıcının diline çevirir (bilinmeyenler olduğu gibi); tekrarsız. */
export const expandKeywords = (words: readonly string[]): string[] => [...new Set(words.map((w) => keywordIndex.get(fold(w.trim())) ?? w.trim().toLowerCase()).filter(Boolean))];

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

/** Seçilen kişi türleri ve yazılan unvanlardan sağlayıcıya gidecek benzersiz unvan listesi (Türkçe ve İngilizce karşılıklarıyla). */
export function expandTitles(q: Pick<LeadSearchInput, "roles" | "titles">): string[] {
  const out = new Map<string, string>();
  for (const r of q.roles) for (const t of roleOptions.find((o) => o.value === r)?.titles ?? []) out.set(t.toLowerCase(), t);
  for (const t of q.titles) for (const v of resolveTitle(t)) out.set(v.toLowerCase(), v);
  return [...out.values()];
}

/** Hariç tutulacak unvanlar (elle yazılanlar + isteğe bağlı stajyer/asistan). */
export function expandNotTitles(q: Pick<LeadSearchInput, "notTitles" | "excludeJunior">): string[] {
  const out = new Map<string, string>();
  for (const t of q.notTitles) for (const v of resolveTitle(t)) out.set(v.toLowerCase(), v);
  for (const t of q.excludeJunior ? juniorTitles : []) out.set(t.toLowerCase(), t);
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

/** Hazır aramalar: tıklayınca metin kutusuna yazılır (Enter'a kullanıcı basar); Adspine AI bunları filtrelere çevirir. */
export type LeadPreset = { id: string; label: string; prompt: string };

export const leadPresets: LeadPreset[] = [
  { id: "pazarlama", label: "Pazarlama yöneticileri", prompt: "Türkiye'deki pazarlama müdürleri ve direktörleri" },
  { id: "kurucu-kobi", label: "Küçük işletme kurucuları", prompt: "Türkiye'deki 1-50 çalışanlı küçük işletmelerin kurucuları" },
  { id: "eticaret", label: "E-ticaret yöneticileri", prompt: "E-ticaret şirketlerinin kurucuları ve genel müdürleri" },
  { id: "otel", label: "Otel ve restoran sahipleri", prompt: "Türkiye'deki otel ve restoran sahipleri" },
  { id: "yazilim", label: "Yazılım şirketi CEO'ları", prompt: "Türkiye'deki yazılım şirketlerinin CEO'ları" },
  { id: "istanbul-ceo", label: "İstanbul'daki üst yöneticiler", prompt: "İstanbul'daki CEO'lar ve genel müdürler" },
];

/** Bir arama varsayılan olarak bu kadar kişi listeler; sonuçtan sonra "daha fazla" ile artırılır. */
export const DEFAULT_COUNT = 10;

export const emptySearch = (country: string = "turkey"): LeadSearchInput => ({ roles: [], titles: [], notTitles: [], excludeJunior: true, perCompany: 1, country, city: undefined, industries: [], sizes: [], keywords: [], notKeywords: [], count: DEFAULT_COUNT });

/** "Ayşe Demir" → "Ayşe D." (önizlemede soyadı kısaltılır). */
export const shortName = (name: string | null) => {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0]} ${parts.at(-1)![0]}.` : (parts[0] ?? "Kişi");
};

// ─── Kişi bul v2: listeleme (kredi harcamadan) ve seçilenleri ekleme ─────────────────────────────

/** Listelenecek kişi sayısı seçenekleri. */
export const browseSizes = [10, 25, 50, 100, 200] as const;

/** Listeleme sonucundaki bir satır: soyadı, e-posta ve LinkedIn gizlidir; kişi eklenince açılır. */
export type BrowseRow = { rid: number; name: string; jobTitle: string | null; company: string | null; location: string | null; owned: boolean; /** JEV uyum skoru (0-100); skorlanamadıysa null. */ score: number | null };

/** Skora göre uyum grubu. */
export const scoreTier = (score: number | null): "yuksek" | "orta" | "dusuk" | null => (score === null ? null : score >= 70 ? "yuksek" : score >= 45 ? "orta" : "dusuk");
export const tierLabels = { yuksek: "Yüksek uyum", orta: "Orta uyum", dusuk: "Düşük uyum" } as const;

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
