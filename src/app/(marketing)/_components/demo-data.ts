/** Landing'deki örnek veriler. Firma adları kurgusaldır. */

export type DemoLead = {
  name: string;
  signals: string;
  score: number;
  /** Google Haritalar'dan geliş sırası (ham liste) */
  scrapedIndex: number;
};

/** Puana göre sıralı. */
export const demoLeads: DemoLead[] = [
  { name: "Lale Diş Kliniği", signals: "Web sitesi yok, 4,8 puan, 312 yorum", score: 92, scrapedIndex: 3 },
  { name: "Feneryolu Dental", signals: "Web sitesi yok, 4,6 puan, 198 yorum", score: 87, scrapedIndex: 0 },
  { name: "Bahariye Ağız ve Diş", signals: "Web sitesi var, 4,5 puan, 140 yorum", score: 74, scrapedIndex: 5 },
  { name: "Kıyı Diş Polikliniği", signals: "Web sitesi var, 4,9 puan, 41 yorum", score: 61, scrapedIndex: 1 },
  { name: "Moda Gülüş Kliniği", signals: "Web sitesi var, 4,2 puan, 66 yorum", score: 48, scrapedIndex: 4 },
  { name: "Yeldeğirmeni Diş", signals: "Telefon yok, 3,9 puan, 12 yorum", score: 33, scrapedIndex: 2 },
];

export const demoBreakdown = {
  lead: demoLeads[0],
  criteria: [
    { label: "Sektör uyumu", value: 95 },
    { label: "İşletme büyüklüğü", value: 70 },
    { label: "Hedef kitle uyumu", value: 90 },
    { label: "Dijital ihtiyaç", value: 98 },
    { label: "Satın alma potansiyeli", value: 85 },
    { label: "Ulaşılabilirlik", value: 88 },
    { label: "Öncelik", value: 94 },
  ],
};

export function scoreTone(score: number) {
  if (score >= 80) return "bg-score-high";
  if (score >= 55) return "bg-score-mid";
  return "bg-score-low";
}
