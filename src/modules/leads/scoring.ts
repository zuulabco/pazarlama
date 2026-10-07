import { computeWeights, type WeightInput, type Weights } from "../profile/weights";

/**
 * Backend'in (AI'sız) nihai skorlaması: JEV'in ham 0–4 puanlarını 0–100'e çevirir,
 * ölçülebilir sinyallerle düzeltir ve kullanıcının profilinden gelen ağırlıklarla toplar.
 * Saf fonksiyonlar: aynı girdi her zaman aynı sonucu verir.
 */

export type JevAnswerLike = { score: number; confidence: number };
export type JevLike = Record<
  "sector_fit" | "size_fit" | "audience_fit" | "service_need" | "purchase_potential" | "reachability" | "priority",
  JevAnswerLike
>;

export type LeadFacts = {
  hasWebsite: boolean;
  hasPhone: boolean;
  /** İşletme sahibi profili sahiplenmemişse false. */
  claimed: boolean | null;
  closed: boolean;
};

export type FinalScores = {
  sector_fit: number;
  company_size: number;
  audience_fit: number;
  digital_need: number;
  purchase_potential: number;
  reachability: number;
  priority: number;
  lead_score: number;
  jev_confidence: number;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
/** JEV'in 0–4 ölçeğini 0–100'e çevirir. */
const scale = (a: JevAnswerLike) => (Math.max(0, Math.min(4, a.score)) / 4) * 100;

/** Ulaşılabilirlik için ölçülebilir kısım: telefon en önemlisidir, web sitesi ve sahiplenilmiş profil destekler. */
function measuredReachability(f: LeadFacts) {
  if (!f.hasPhone && !f.hasWebsite) return 10;
  return Math.min(100, (f.hasPhone ? 60 : 15) + (f.hasWebsite ? 25 : 0) + (f.claimed ? 15 : 0));
}

export function finalizeScores(jev: JevLike, facts: LeadFacts, profile: WeightInput): FinalScores {
  const sectorFit = scale(jev.sector_fit);
  const companySize = scale(jev.size_fit);
  const audienceFit = scale(jev.audience_fit);
  const purchasePotential = scale(jev.purchase_potential);

  // Dijital ihtiyaç: web sitesi yok ya da profil sahiplenilmemişse, JEV'in tahminine ek ağırlık verilir.
  let digitalNeed = scale(jev.service_need);
  if (!facts.hasWebsite) digitalNeed += 15;
  if (facts.claimed === false) digitalNeed += 5;

  // Ulaşılabilirlik: JEV'in yorumu ile ölçülebilir iletişim bilgilerinin ortalaması.
  const reachability = 0.5 * scale(jev.reachability) + 0.5 * measuredReachability(facts);

  const values: Record<keyof Weights, number> = {
    sectorFit: clamp(sectorFit),
    companySize: clamp(companySize),
    audienceFit: clamp(audienceFit),
    digitalNeed: clamp(digitalNeed),
    purchasePotential: clamp(purchasePotential),
    reachability: clamp(reachability),
  };

  const weights = computeWeights(profile);
  const weighted = (Object.keys(values) as (keyof Weights)[]).reduce((sum, k) => sum + (weights[k] * values[k]) / 100, 0);

  // Düşük güvenli cevaplar skoru hafifçe aşağı çeker (en fazla %10).
  const answers = Object.values(jev);
  const confidence = answers.reduce((s, a) => s + a.confidence, 0) / answers.length;
  const leadScore = facts.closed ? 0 : clamp(weighted * (0.9 + 0.1 * Math.max(0, Math.min(1, confidence))));

  return {
    sector_fit: values.sectorFit,
    company_size: values.companySize,
    audience_fit: values.audienceFit,
    digital_need: values.digitalNeed,
    purchase_potential: values.purchasePotential,
    reachability: values.reachability,
    priority: facts.closed ? 0 : clamp(0.5 * scale(jev.priority) + 0.5 * leadScore),
    lead_score: leadScore,
    jev_confidence: Math.round(confidence * 1000) / 1000,
  };
}
