export const site = {
  name: "Sinyal",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
  title: "Potansiyel Müşteri Bulma ve Puanlama | Sinyal",
  description:
    "Bölgenizdeki firmaları Google Haritalar'dan bulun, yedi kritere göre puanlayın ve hizmetinize en çok ihtiyacı olan potansiyel müşterilere önce ulaşın.",
  locale: "tr_TR",
} as const;
