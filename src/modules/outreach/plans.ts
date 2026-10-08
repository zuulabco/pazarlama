/** Paketler ve sınırları (sunucu ve istemci ortak). Fiyatlar ödeme altyapısı bağlanınca eklenecek; şimdilik yalnızca sınırlar uygulanır. */

export type PlanKey = "ucretsiz" | "baslangic" | "buyume" | "ajans";

export type Plan = {
  key: PlanKey;
  label: string;
  /** Aynı anda bağlanabilecek gönderici adresi sayısı: gönderim hacminin ana ölçüsü. */
  senders: number;
  /** Her ay yenilenen kredi. 1 kredi = e-posta adresi bulunan 1 kişi. */
  monthlyCredits: number;
  /** Açılabilecek en çok otomasyon (arşivlenenler hariç). */
  campaigns: number;
  /** Günde en çok kaç kişi aranabilir (kötüye kullanıma ve maliyete karşı). */
  dailyLeadCap: number;
  /** Kredi harcamadan günde en çok kaç kişi listelenebilir (Kişi bul'da "önce göz at"; maliyeti bize aittir). */
  browsePerDay: number;
};

export const plans: Record<PlanKey, Plan> = {
  ucretsiz: { key: "ucretsiz", label: "Ücretsiz", senders: 1, monthlyCredits: 25, campaigns: 1, dailyLeadCap: 25, browsePerDay: 25 },
  baslangic: { key: "baslangic", label: "Başlangıç", senders: 3, monthlyCredits: 750, campaigns: 5, dailyLeadCap: 150, browsePerDay: 200 },
  buyume: { key: "buyume", label: "Büyüme", senders: 5, monthlyCredits: 2500, campaigns: 20, dailyLeadCap: 500, browsePerDay: 500 },
  ajans: { key: "ajans", label: "Ajans", senders: 15, monthlyCredits: 8000, campaigns: 100, dailyLeadCap: 1000, browsePerDay: 1500 },
};

export const planList = Object.values(plans);
export const planOf = (key: string | null | undefined): Plan => plans[(key as PlanKey) in plans ? (key as PlanKey) : "ucretsiz"];

/** Bir gönderici adresinden günde güvenle gönderilebilecek e-posta (soğuk e-posta için ~20-50; ortası). */
export const SAFE_DAILY_PER_SENDER = 30;
/** İş günü sayısı (aylık gönderim tahmini için). */
const BUSINESS_DAYS = 22;

/** Paketin yaklaşık aylık gönderim kapasitesi: gönderici adresi × günlük güvenli gönderim × iş günü. */
export const monthlyCapacity = (plan: Plan) => plan.senders * SAFE_DAILY_PER_SENDER * BUSINESS_DAYS;
