import "server-only";
import { score, TypeSafeClient, type JsonValue } from "@typesafe-ai/sdk";
import type { Profile } from "../profile/repository";
import type { Place } from "./apify";
import { jevConcurrency } from "./config";

/**
 * JEV (TypeSafe System One): her firma için tek istekte yedi kriteri puanlar.
 * Model İngilizcede en doğru çalışır; Türkçe değerler olduğu gibi geçirilir, rubrikler İngilizcedir.
 * Skor 0–4 arasıdır (ondalıklı); güven değeri 0–1 arasıdır.
 */

export const jevCriteria = [
  "sector_fit",
  "size_fit",
  "audience_fit",
  "service_need",
  "purchase_potential",
  "reachability",
  "priority",
] as const;
export type JevCriterion = (typeof jevCriteria)[number];
export type JevAnswer = { score: number; confidence: number };
export type JevScores = Record<JevCriterion, JevAnswer>;

const rubric = (...levels: [string, string, ...string[]]) => levels;

const questions = {
  sector_fit: score(
    "How well does the prospect belong to the sectors the seller serves?",
    rubric(
      "Completely different sector",
      "Mostly unrelated sector",
      "Loosely related to a target sector",
      "Clearly inside a target sector",
      "Exactly the seller's target niche",
    ),
  ),
  size_fit: score(
    "How closely does the prospect's likely size match the seller's target company size? Estimate from review count, category and whether it looks like a chain.",
    rubric(
      "Far from the target size",
      "Somewhat far from the target size",
      "Plausibly near the target size",
      "Close to the target size",
      "Matches the target size",
    ),
  ),
  audience_fit: score(
    "How much does the prospect look like the typical customer of the services the seller offers?",
    rubric(
      "Never buys such services",
      "Rarely buys such services",
      "Sometimes buys such services",
      "Often buys such services",
      "Is exactly the typical buyer",
    ),
  ),
  service_need: score(
    "How much does the prospect need the services the seller offers? Consider a missing website, an unclaimed profile, weak online presence and the seller's good-prospect signals.",
    rubric("No visible need", "Slight need", "Moderate need", "Strong need", "Obvious, urgent need"),
  ),
  purchase_potential: score(
    "How likely is the prospect to buy from the seller soon, given its activity level, apparent budget and the seller's average project value?",
    rubric("Very unlikely to buy", "Unlikely to buy", "Might buy", "Likely to buy", "Very likely to buy"),
  ),
  reachability: score(
    "How easy is it to reach a decision maker through the seller's outreach channels, given the contact details available?",
    rubric("Practically unreachable", "Hard to reach", "Reachable with effort", "Easy to reach", "Very easy to reach directly"),
  ),
  priority: score(
    "How high should the prospect rank on the seller's outreach list overall?",
    rubric("Skip", "Low priority", "Medium priority", "High priority", "Contact first"),
  ),
};

/** Seçenek kodlarının JEV için İngilizce karşılıkları; kullanıcının yazdığı metinler olduğu gibi kalır. */
const en: Record<string, string> = {
  ajans: "agency",
  serbest: "freelancer",
  urun: "product or software company",
  "web-tasarim": "web design",
  seo: "SEO",
  "sosyal-medya": "social media management",
  reklam: "advertising management",
  icerik: "content production",
  marka: "branding and logo design",
  yazilim: "software and mobile apps",
  eticaret: "e-commerce setup",
  danismanlik: "consulting",
  saglik: "healthcare and clinics",
  restoran: "restaurants and cafes",
  guzellik: "beauty and hair salons",
  emlak: "real estate",
  egitim: "education and courses",
  "hukuk-muhasebe": "legal and accounting",
  otomotiv: "automotive",
  turizm: "tourism and hotels",
  perakende: "retail and shops",
  insaat: "construction and architecture",
  spor: "sports and fitness",
  diger: "other",
  mikro: "micro (1-9 people)",
  kucuk: "small (10-49 people)",
  orta: "medium (50+ people)",
  farketmez: "any size",
  "15k-alti": "under 15 thousand TRY",
  "15k-50k": "15-50 thousand TRY",
  "50k-150k": "50-150 thousand TRY",
  "150k-ustu": "over 150 thousand TRY",
  telefon: "phone",
  whatsapp: "WhatsApp",
  eposta: "email",
  instagram: "Instagram messages",
  linkedin: "LinkedIn",
  "yuz-yuze": "in-person visits",
  "no-website": "has no website",
  "weak-website": "has an outdated or weak website",
  "busy-offline": "has many customers but a weak digital presence",
  "low-social": "is not active on social media",
  "no-booking": "cannot take online bookings or orders",
  "new-business": "is newly opened or growing",
};
const t = (v: string) => en[v] ?? v;

/** JSON'da undefined olamaz: boş alanları çıkarır. */
const compact = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as JsonValue;

function sellerState(p: Profile) {
  return compact({
    business_type: t(p.workType),
    description: p.businessDescription || undefined,
    offered_services: p.services.map(t),
    target_sectors: p.targetSectors.map(t),
    target_company_size: t(p.targetSize),
    target_region: p.cityScope === "turkey" ? "all of Turkey" : p.targetCities,
    average_project_value: t(p.dealValue),
    outreach_channels: p.channels.map(t),
    good_prospect_signals: p.signals.map(t),
    good_prospect_notes: p.signalNotes || undefined,
  });
}

function prospectState(l: Place) {
  return compact({
    name: l.name,
    category: l.category,
    other_categories: l.categories.slice(0, 5),
    district: l.district ?? l.city,
    rating: l.rating,
    review_count: l.reviewCount,
    has_website: Boolean(l.website),
    has_phone: Boolean(l.phone),
    profile_claimed_by_owner: l.claimed,
    photo_count: l.imageCount,
  });
}

let client: TypeSafeClient | undefined;
const jev = () => (client ??= new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY }));

export async function scoreWithJev(profile: Profile, place: Place): Promise<JevScores> {
  const { answers } = await jev().systemOne({
    state: { seller: sellerState(profile), prospect: prospectState(place) },
    questions,
  });
  return Object.fromEntries(
    jevCriteria.map((k) => [k, { score: answers[k].score, confidence: answers[k].confidence }]),
  ) as JevScores;
}

/** En fazla `jevConcurrency` isteği aynı anda çalıştırır; bir firmanın hatası diğerlerini durdurmaz. */
export async function scoreMany<T extends { place: Place }>(
  profile: Profile,
  items: T[],
  onDone: (item: T, result: JevScores | Error) => Promise<void>,
) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++];
      const result = await scoreWithJev(profile, item.place).catch((e: unknown) =>
        e instanceof Error ? e : new Error(String(e)),
      );
      await onDone(item, result);
    }
  };
  await Promise.all(Array.from({ length: Math.min(jevConcurrency, items.length) }, worker));
}
