import { BoltIcon, BookmarkIcon, ChartIcon, InboxIcon, PenIcon, SearchIcon, SendIcon } from "@/components/ui/icons";

type Icon = typeof SearchIcon;

export type SectionLink = {
  label: string;
  href: string;
  /** Yerel işletmeler modundayken gidilecek adres (Bul bölümünde "Kişiler" ve "Yerel işletmeler" aynı sayfa grubunun iki modudur). */
  firmsHref?: string;
  icon: Icon;
  prefixes: readonly string[];
};
export type Section = { key: "bul" | "ulas"; label: string; hint: string; icon: Icon; href: string; links: readonly SectionLink[] };

/**
 * İki ana iş akışı bölümü. Sol çubukta her biri tek simgedir; açılınca kendi ikinci sol çubuğunu (alt sayfalar) gösterir.
 *   Bul: potansiyel müşterileri bul (kişiler, yerel firmalar). Ulaş: onlara ulaş ve sonuçları izle.
 */
export const sections: readonly Section[] = [
  {
    key: "bul",
    label: "Bul",
    hint: "Potansiyel müşterileri bulun ve kaydedin",
    icon: SearchIcon,
    href: "/panel/kisi-bul",
    links: [
      { label: "Müşteri bul", href: "/panel/kisi-bul", firmsHref: "/panel/musteri-bul", icon: SearchIcon, prefixes: ["/panel/kisi-bul", "/panel/musteri-bul", "/panel/musteri"] },
      { label: "Kaydedilenler", href: "/panel/kisiler", firmsHref: "/panel/firmalar", icon: BookmarkIcon, prefixes: ["/panel/kisiler", "/panel/firmalar"] },
    ],
  },
  {
    key: "ulas",
    label: "Ulaş",
    hint: "Onlara ulaşın ve sonuçları izleyin",
    icon: SendIcon,
    href: "/panel/otomasyon",
    links: [
      { label: "Otomasyon", href: "/panel/otomasyon", icon: BoltIcon, prefixes: ["/panel/otomasyon"] },
      { label: "Gelen kutusu", href: "/panel/gelen-kutusu", icon: InboxIcon, prefixes: ["/panel/gelen-kutusu"] },
      { label: "Mesaj hazırla", href: "/panel/calis", icon: PenIcon, prefixes: ["/panel/calis"] },
      { label: "Raporlar", href: "/panel/raporlar", icon: ChartIcon, prefixes: ["/panel/raporlar"] },
    ],
  },
];

/** Yerel işletmeler modundaki sayfalar (Kişiler modunun karşısı). */
export const onFirms = (path: string) => matches(path, ["/panel/musteri-bul", "/panel/musteri", "/panel/firmalar"]);

/** Bölüm bağlantısının, geçerli moda göre gidilecek adresi. */
export const hrefFor = (l: SectionLink, path: string) => (l.firmsHref && onFirms(path) ? l.firmsHref : l.href);

export const matches = (path: string, prefixes: readonly string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));

/** Yola karşılık gelen bölüm (yoksa null: ana sayfa, takvim, gönderici adresleri…). */
export const sectionOf = (path: string) => sections.find((s) => s.links.some((l) => matches(path, l.prefixes))) ?? null;
