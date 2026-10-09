/** Planlar ve sınırları (sunucu ve istemci ortak). Fiyatlar ödeme altyapısı bağlanınca eklenecek; şimdilik yalnızca sınırlar uygulanır. */

export type PlanKey = "ucretsiz" | "baslangic" | "buyume" | "ajans";

export type Plan = {
  key: PlanKey;
  label: string;
  /** Aynı anda bağlanabilecek gönderici adresi sayısı: gönderim hacminin ana ölçüsü. */
  senders: number;
  /** Her ay yenilenen Spine Kredi. 1 Spine Kredi = listeden açılıp Kişiler'e eklenen, gizli bilgisi (e-posta) açılan 1 kişi/firma. */
  monthlyCredits: number;
  /** Açılabilecek en çok otomasyon (arşivlenenler hariç). */
  campaigns: number;
  /** Günde en çok kaç kişi aranabilir (kötüye kullanıma ve maliyete karşı). */
  dailyLeadCap: number;
  /** Günde en çok kaç kişi listelenebilir (günlük güvenlik tavanı; asıl sınır aylık havuzdur). */
  browsePerDay: number;
  /** Ayda en çok kaç kişi listelenebilir (kredinin 3 katı; her ay başında yenilenir). */
  browsePerMonth: number;
  /** Tanıtım sayfasında gösterilen özellikler. Şimdilik yalnızca gösterimdir; kullanım henüz plana göre kısıtlanmıyor. */
  warmupAndInbox: boolean;
  /** Aylık fiyat (ABD doları; 0 = ücretsiz). Tanıtım sayfasında gösterilir; ödeme altyapısı bağlanınca kesinleşir. */
  priceUsd: number;
  ai: boolean;
};

export const plans: Record<PlanKey, Plan> = {
  ucretsiz: { key: "ucretsiz", label: "Ücretsiz", senders: 1, monthlyCredits: 25, campaigns: 1, dailyLeadCap: 25, browsePerDay: 25, browsePerMonth: 75, warmupAndInbox: false, ai: false, priceUsd: 0 },
  baslangic: { key: "baslangic", label: "Başlangıç", senders: 3, monthlyCredits: 750, campaigns: 3, dailyLeadCap: 150, browsePerDay: 400, browsePerMonth: 2250, warmupAndInbox: false, ai: false, priceUsd: 29 },
  buyume: { key: "buyume", label: "Büyüme", senders: 10, monthlyCredits: 2500, campaigns: 20, dailyLeadCap: 500, browsePerDay: 1000, browsePerMonth: 7500, warmupAndInbox: true, ai: true, priceUsd: 79 },
  ajans: { key: "ajans", label: "Ajans", senders: 20, monthlyCredits: 8000, campaigns: 100, dailyLeadCap: 1000, browsePerDay: 3000, browsePerMonth: 24000, warmupAndInbox: true, ai: true, priceUsd: 179 },
};

export const planList = Object.values(plans);
export const planOf = (key: string | null | undefined): Plan => plans[(key as PlanKey) in plans ? (key as PlanKey) : "ucretsiz"];

/** Bir gönderici adresinden günde güvenle gönderilebilecek e-posta (soğuk e-posta için ~20-50; ortası). */
export const SAFE_DAILY_PER_SENDER = 30;
/** İş günü sayısı (aylık gönderim tahmini için). */
const BUSINESS_DAYS = 22;

/** Paketin yaklaşık aylık gönderim kapasitesi: gönderici adresi × günlük güvenli gönderim × iş günü. */
export const monthlyCapacity = (plan: Plan) => plan.senders * SAFE_DAILY_PER_SENDER * BUSINESS_DAYS;
