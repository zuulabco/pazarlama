/**
 * Kullanıcının hedef profilinden, lead skorunu oluşturan altı kriterin ağırlıkları.
 * Saf fonksiyon (AI yok): hem onboarding'deki canlı önizleme hem de ileride
 * Müşteri Bul skorlaması aynı fonksiyonu kullanır. Katsayılar başlangıç değerleridir,
 * gerçek verilerle ayarlanacaktır.
 */

export const criteria = [
  { key: "sectorFit", label: "Sektör uyumu" },
  { key: "companySize", label: "İşletme büyüklüğü" },
  { key: "audienceFit", label: "Hedef kitle uyumu" },
  { key: "digitalNeed", label: "Dijital ihtiyaç" },
  { key: "purchasePotential", label: "Satın alma potansiyeli" },
  { key: "reachability", label: "Ulaşılabilirlik" },
] as const;

export type CriterionKey = (typeof criteria)[number]["key"];
export type Weights = Record<CriterionKey, number>;

export type WeightInput = {
  services?: readonly string[];
  targetSectors?: readonly string[];
  targetSizes?: readonly string[];
  signals?: readonly string[];
  channels?: readonly string[];
  dealValue?: string;
};

export function computeWeights(p: WeightInput): Weights {
  const w: Weights = {
    sectorFit: 1,
    companySize: 1,
    audienceFit: 1,
    digitalNeed: 1,
    purchasePotential: 1,
    reachability: 1,
  };

  // Aranan işaretler ağırlıklı olarak dijital ihtiyacı belirler.
  w.digitalNeed += 0.45 * Math.min(p.signals?.length ?? 0, 4);

  // Dar bir sektör odağı, sektör uyumunu daha belirleyici yapar.
  const sectorCount = p.targetSectors?.length ?? 0;
  if (sectorCount > 0 && sectorCount <= 2) w.sectorFit += 0.5;

  // Dar bir büyüklük hedefi (en çok iki dilim) varsa büyüklük daha önemlidir.
  const sizes = p.targetSizes ?? [];
  if (sizes.length > 0 && sizes.length <= 2 && !sizes.includes("farketmez")) w.companySize += 0.5;

  // Yüksek proje bedeli: bütçesi olan, daha büyük firmalar öne çıkar.
  if (p.dealValue === "50k-150k" || p.dealValue === "150k-ustu") {
    w.purchasePotential += 0.6;
    w.companySize += 0.3;
  } else if (p.dealValue === "15k-50k") {
    w.purchasePotential += 0.3;
  }

  // Az kanalla ulaşıyorsanız, iletişim bilgisi bulunması daha kritiktir.
  const channelCount = p.channels?.length ?? 0;
  if (channelCount > 0) w.reachability += channelCount <= 2 ? 0.5 : 0.2;

  // Odaklı bir hizmet sunumu, hedef kitle uyumunu öne çıkarır.
  const serviceCount = p.services?.length ?? 0;
  if (serviceCount > 0 && serviceCount <= 2) w.audienceFit += 0.3;

  return toPercentages(w);
}

/** Toplamı tam 100 yapan, en büyük kalan yöntemiyle yuvarlama. */
function toPercentages(w: Weights): Weights {
  const keys = criteria.map((c) => c.key);
  const total = keys.reduce((sum, k) => sum + w[k], 0);
  const raw = keys.map((k) => ({ k, v: (w[k] / total) * 100 }));
  const floored = raw.map((r) => ({ ...r, n: Math.floor(r.v) }));
  let left = 100 - floored.reduce((sum, r) => sum + r.n, 0);
  [...floored]
    .sort((a, b) => b.v - b.n - (a.v - a.n))
    .forEach((r) => {
      if (left > 0) {
        r.n += 1;
        left -= 1;
      }
    });
  return Object.fromEntries(floored.map((r) => [r.k, r.n])) as Weights;
}
