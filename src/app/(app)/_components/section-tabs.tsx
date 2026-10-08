"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sectionOf } from "./nav-config";
import { toggleSection, useSectionCollapsed } from "./section-state";

/**
 * Sayfanın üst çubuğu (Instantly düzeni): solda bölüm başlığı, yanında alt görünümlerin sekmeleri. Sayfa kaydırılırken üstte kalır.
 * Sekme yoksa yalnızca başlık görünür.
 */
export function SectionTabs({ title, tabs = [] }: { title: string; tabs?: readonly { href: string; label: string }[] }) {
  const path = usePathname();
  const inSection = sectionOf(path) !== null;
  const collapsed = useSectionCollapsed();
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-5 flex h-12 items-center gap-6 border-b border-line bg-paper/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 md:-ml-6 md:pl-6">
      {inSection && (
        <button
          type="button"
          onClick={toggleSection}
          aria-expanded={!collapsed}
          aria-controls="section-sidebar"
          aria-label={collapsed ? "Yan menüyü aç" : "Yan menüyü kapat"}
          title={collapsed ? "Yan menüyü aç" : "Yan menüyü kapat"}
          className="-mr-3 hidden size-8 shrink-0 place-items-center rounded-control text-muted transition-colors hover:bg-sunken hover:text-ink md:grid"
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="14" height="12" rx="2.2" />
            <path d="M8 4v12" />
            {!collapsed && <path d="M5.2 8.5v3" />}
          </svg>
        </button>
      )}
      <h1 className="shrink-0 text-sm font-semibold tracking-tight">{title}</h1>
      {tabs.length > 0 && (
        <nav aria-label={`${title} bölümleri`} className="flex h-full min-w-0 gap-1 overflow-x-auto [scrollbar-width:none]">
          {tabs.map((t) => {
            const active = path === t.href || path.startsWith(`${t.href}/`);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className="relative flex h-full items-center border-b-2 border-transparent px-3 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:text-ink aria-[current=page]:border-forest aria-[current=page]:text-ink"
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}

/** Yerel firmalar bölümünün sekmeleri: bul → kayıtlı firmalar. */
export const customerTabs = [
  { href: "/panel/musteri-bul", label: "Firma bul" },
  { href: "/panel/firmalar", label: "Kayıtlı firmalar" },
] as const;

/** Kişiler uygulamasının sekmeleri (Instantly: SuperSearch · Leads). */
export const leadsTabs = [
  { href: "/panel/kisi-bul", label: "Kişi bul" },
  { href: "/panel/kisiler", label: "Kayıtlı kişiler" },
] as const;

/** Otomasyon sayfalarının üst çubuğu: yola göre başlığı ve (varsa) sekmeleri seçer. */
export function AutomationBar() {
  const path = usePathname();
  if (path.startsWith("/panel/kisi-bul") || path.startsWith("/panel/kisiler")) return <SectionTabs title="Kişiler" tabs={leadsTabs} />;
  if (path.startsWith("/panel/otomasyon")) return <SectionTabs title="Otomasyon" />;
  if (path.startsWith("/panel/raporlar")) return <SectionTabs title="Raporlar" />;
  if (path.startsWith("/panel/gelen-kutusu")) return <SectionTabs title="Gelen kutusu" />;
  if (path.startsWith("/panel/posta-kutulari")) return <SectionTabs title="Gönderici adresleri" />;
  return <SectionTabs title="Otomasyon" />;
}
