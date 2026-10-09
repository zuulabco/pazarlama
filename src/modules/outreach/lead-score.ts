import "server-only";
import { score as scoreQuestion, TypeSafeClient, type JsonValue } from "@typesafe-ai/sdk";
import type { Profile } from "../profile/repository";
import { channels, sectors, services, signals, workTypes } from "../profile/options";
import type { LeadSearchInput } from "./lead-options";

/**
 * JEV (TypeSafe System One) ile kişi skorlaması: her listelenen kişi, kullanıcının profiline (ne sattığı, kime sattığı) göre
 * altı soruyla puanlanır; sonuç 0-100 uyum skorudur. Liste skora göre sıralanır, "yüksek / orta / düşük uyum" gruplarına ayrılır.
 * Model İngilizcede en doğru çalışır; sorular ve rubrikler İngilizcedir, Türkçe değerler olduğu gibi geçirilir.
 */

export const leadCriteria = ["sector_fit", "size_fit", "audience_fit", "service_need", "purchase_potential", "priority"] as const;
type Criterion = (typeof leadCriteria)[number];

const rubric = (...levels: [string, string, ...string[]]) => levels;

const questions = {
  sector_fit: scoreQuestion(
    "How well does the prospect's company belong to the sectors the seller serves? Judge from the company name, domain and the industry filters used to find it.",
    rubric("Completely different sector", "Mostly unrelated sector", "Loosely related to a target sector", "Clearly inside a target sector", "Exactly the seller's target niche"),
  ),
  size_fit: scoreQuestion(
    "How closely does the prospect's company size (from the employee-range filters used to find it) match the seller's target company size?",
    rubric("Far from the target size", "Somewhat far from the target size", "Plausibly near the target size", "Close to the target size", "Matches the target size"),
  ),
  audience_fit: scoreQuestion(
    "Is the prospect's job title the kind of person who decides on or buys the services the seller offers?",
    rubric("Would never be involved in such a purchase", "Rarely involved", "Sometimes involved", "Often a decision maker or strong influencer", "Is exactly the decision maker"),
  ),
  service_need: scoreQuestion(
    "How much would this prospect's company plausibly need the services the seller offers, given its sector and the seller's good-prospect signals?",
    rubric("No visible need", "Slight need", "Moderate need", "Strong need", "Obvious, urgent need"),
  ),
  purchase_potential: scoreQuestion(
    "How likely is this prospect to buy from the seller soon, given the seniority of the role and the apparent size of the company?",
    rubric("Very unlikely to buy", "Unlikely to buy", "Might buy", "Likely to buy", "Very likely to buy"),
  ),
  priority: scoreQuestion(
    "How high should this prospect rank on the seller's outreach list overall?",
    rubric("Skip", "Low priority", "Medium priority", "High priority", "Contact first"),
  ),
};

/** Toplam skorda her sorunun payı (toplam 1). Karar verici uyumu ve sektör en ağırdır. */
const weights: Record<Criterion, number> = { sector_fit: 0.22, audience_fit: 0.24, size_fit: 0.12, service_need: 0.16, purchase_potential: 0.12, priority: 0.14 };

/** Seçenek kodlarının İngilizce karşılıkları; çevirisi olmayanlar Türkçe etiketiyle, kullanıcının yazdıkları olduğu gibi geçer. */
const en: Record<string, string> = {
  ajans: "agency", serbest: "freelancer", urun: "product or software company",
  "web-tasarim": "web design", seo: "SEO", "sosyal-medya": "social media management", reklam: "advertising management", icerik: "content production",
  marka: "branding and logo design", yazilim: "software and mobile apps", eticaret: "e-commerce setup", danismanlik: "consulting",
  saglik: "healthcare and clinics", restoran: "restaurants and cafes", guzellik: "beauty and hair salons", emlak: "real estate", egitim: "education and courses",
  "hukuk-muhasebe": "legal and accounting", otomotiv: "automotive", turizm: "tourism and hotels", perakende: "retail and shops", insaat: "construction and architecture",
  spor: "sports and fitness", diger: "other",
  "tek-kisi": "single-person business (1 person)", mikro: "micro (2-9 people)", kucuk: "small (10-49 people)", orta: "medium (50-249 people)", buyuk: "large (250+ people)", farketmez: "any size",
  telefon: "phone", whatsapp: "WhatsApp", eposta: "email", instagram: "Instagram messages", linkedin: "LinkedIn", "yuz-yuze": "in-person visits",
  "no-website": "has no website", "weak-website": "has an outdated or weak website", "busy-offline": "has many customers but a weak digital presence",
  "low-social": "is not active on social media", "no-booking": "cannot take online bookings or orders", "new-business": "is newly opened or growing",
};
const labels = new Map<string, string>([...workTypes, ...services, ...sectors, ...signals, ...channels].map((o) => [o.value, o.label]));
const t = (v: string) => en[v] ?? labels.get(v) ?? v;

const compact = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== "")) as JsonValue;

export function sellerState(p: Profile) {
  return compact({
    business_type: t(p.workType),
    description: p.businessDescription || undefined,
    offered_services: p.services.map(t),
    target_sectors: p.targetSectors.map(t),
    target_company_size: p.targetSizes.map(t),
    target_region: p.cityScope === "turkey" ? "all of Turkey" : p.targetCities,
    outreach_channels: p.channels.map(t),
    good_prospect_signals: p.signals.map(t),
    good_prospect_notes: p.signalNotes || undefined,
  });
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/** Sağlayıcı kaydından JEV'e giden alıcı durumu. Sektör ve büyüklük, kaydı bulduran filtrelerdir. */
export function prospectState(item: Record<string, unknown>, q: Pick<LeadSearchInput, "industries" | "sizes" | "keywords">) {
  return compact({
    job_title: str(item.title) ?? str(item.headline),
    company: str(item.organization_name),
    company_domain: str(item.organization_primary_domain),
    location: [str(item.city), str(item.state), str(item.country)].filter(Boolean).join(", ") || undefined,
    industry_filters: q.industries.length ? q.industries : undefined,
    company_size_filters: q.sizes.length ? q.sizes : undefined,
    keyword_filters: q.keywords.length ? q.keywords : undefined,
  });
}

let client: TypeSafeClient | undefined;
const jev = () => (client ??= new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY }));

/** Skorlama yapılandırılmış mı? (Anahtar yoksa liste skorsuz, sağlayıcı sırasıyla gelir.) */
export const scoringEnabled = () => Boolean(process.env.TYPESAFE_API_KEY);

/** Tek kişinin 0-100 uyum skoru. Düşük güvenli cevaplar skoru en çok %10 aşağı çeker. */
export async function scoreLead(profile: Profile, item: Record<string, unknown>, q: LeadSearchInput): Promise<number> {
  const { answers } = await jev().systemOne({ state: { seller: sellerState(profile), prospect: prospectState(item, q) }, questions });
  const clamp = (n: number) => Math.max(0, Math.min(4, n));
  const weighted = leadCriteria.reduce((sum, k) => sum + weights[k] * (clamp(answers[k].score) / 4), 0);
  const confidence = leadCriteria.reduce((s, k) => s + Math.max(0, Math.min(1, answers[k].confidence)), 0) / leadCriteria.length;
  return Math.round(100 * weighted * (0.9 + 0.1 * confidence));
}

export type ScoredItem = Record<string, unknown> & { _s?: number | null };

/**
 * Henüz skorlanmamış kayıtları (en çok `max`, aynı anda `concurrency`) skorlar; süre dolarsa kalanı sonraki tura bırakır.
 * Bir kaydın hatası diğerlerini durdurmaz: o kayıt skorsuz (null) işaretlenir, böylece tur sonsuza dek tekrarlanmaz.
 * Dönen değer: bu turda işlenen kayıt sayısı. `items` yerinde güncellenir.
 */
export async function scoreChunk(profile: Profile, items: ScoredItem[], q: LeadSearchInput, opts: { max: number; concurrency: number; deadlineMs: number }): Promise<number> {
  const todo = items.filter((it) => it._s === undefined);
  if (todo.length === 0) return 0;
  if (!scoringEnabled()) {
    for (const it of todo) it._s = null;
    return todo.length;
  }
  const batch = todo.slice(0, opts.max);
  const until = Date.now() + opts.deadlineMs;
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < batch.length && Date.now() < until) {
      const it = batch[next++];
      try {
        it._s = await scoreLead(profile, it, q);
      } catch (e) {
        console.error("Kişi skorlanamadı:", e instanceof Error ? e.message : e);
        it._s = null;
      }
      done++;
    }
  };
  await Promise.all(Array.from({ length: Math.min(opts.concurrency, batch.length) }, worker));
  return done;
}
