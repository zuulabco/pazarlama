export type ModuleStatus = "ready" | "soon";

export type AppModule = {
  id: string;
  name: string;
  description: string;
  href: string;
  status: ModuleStatus;
};

/** Panelde ve landing sayfasında gösterilen modüller. Yeni modül buraya eklenir. */
export const appModules: readonly AppModule[] = [
  {
    id: "musteri-bul",
    name: "Müşteri bul",
    description: "Bölgenizdeki firmaları bulun, puanlayın ve önceliklendirin.",
    href: "/panel/musteri-bul",
    status: "ready",
  },
  {
    id: "calis",
    name: "İletişim kur",
    description: "Yapay zekâ ile saniyeler içinde, işletmenize ve alıcıya özel mesaj ve e-posta yazın; WhatsApp ya da e-postadan tek tıkla gönderin.",
    href: "/panel/calis",
    status: "ready",
  },
  {
    id: "meta-reklam",
    name: "Meta reklam analizi",
    description: "Kampanyalarınızın neden iyi ya da kötü gittiğini sade bir dille görün.",
    href: "/panel",
    status: "soon",
  },
  {
    id: "reklam-icerik",
    name: "Reklam içeriği üretimi",
    description: "A/B testleri için metin, görsel ve video varyasyonları hazırlayın.",
    href: "/panel",
    status: "soon",
  },
  {
    id: "rakip-analizi",
    name: "Rakip analizi",
    description: "Rakiplerinizin reklamlarını ve konumlanmasını takip edin.",
    href: "/panel",
    status: "soon",
  },
];
