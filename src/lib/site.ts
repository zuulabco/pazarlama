export const site = {
  name: "Adspine",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
  title: "Potansiyel Müşteri Bulma ve Puanlama | Adspine",
  description:
    "Bölgenizdeki firmaları bulun, yedi kritere göre puanlayın ve hizmetinize en çok ihtiyacı olan potansiyel müşterilere önce ulaşın.",
  locale: "tr_TR",
} as const;
