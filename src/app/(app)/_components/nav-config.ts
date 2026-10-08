import { ChartIcon, InboxIcon, MapPinIcon, PenIcon, SearchIcon, SendIcon, UsersIcon } from "@/components/ui/icons";

type Icon = typeof SearchIcon;

export type SectionLink = { label: string; href: string; icon: Icon; prefixes: readonly string[] };
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
      { label: "Kişiler", href: "/panel/kisi-bul", icon: UsersIcon, prefixes: ["/panel/kisi-bul", "/panel/kisiler"] },
      { label: "Firmalar", href: "/panel/musteri-bul", icon: MapPinIcon, prefixes: ["/panel/musteri", "/panel/musteri-bul", "/panel/firmalar"] },
    ],
  },
  {
    key: "ulas",
    label: "Ulaş",
    hint: "Onlara ulaşın ve sonuçları izleyin",
    icon: SendIcon,
    href: "/panel/kampanyalar",
    links: [
      { label: "Kampanyalar", href: "/panel/kampanyalar", icon: SendIcon, prefixes: ["/panel/kampanyalar", "/panel/otomasyon"] },
      { label: "Gelen kutusu", href: "/panel/gelen-kutusu", icon: InboxIcon, prefixes: ["/panel/gelen-kutusu"] },
      { label: "Mesaj hazırla", href: "/panel/calis", icon: PenIcon, prefixes: ["/panel/calis"] },
      { label: "Raporlar", href: "/panel/raporlar", icon: ChartIcon, prefixes: ["/panel/raporlar"] },
    ],
  },
];

export const matches = (path: string, prefixes: readonly string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));

/** Yola karşılık gelen bölüm (yoksa null: ana sayfa, takvim, gönderici adresleri…). */
export const sectionOf = (path: string) => sections.find((s) => s.links.some((l) => matches(path, l.prefixes))) ?? null;
