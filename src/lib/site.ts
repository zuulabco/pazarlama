export const site = {
  name: "Adspine",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
  title: "Potansiyel Müşteri Bulma ve E-posta Otomasyonu | Adspine",
  description:
    "Karar vericileri bulun, Adspine AI ile yazdığınız e-postaları kendi adresinizden otomatik gönderin, yanıtları tek kutuda toplayın.",
  locale: "tr_TR",
} as const;
