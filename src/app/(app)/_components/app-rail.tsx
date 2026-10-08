"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { HomeIcon, MailIcon, MapPinIcon, SendIcon, UsersIcon } from "@/components/ui/icons";
import { Wordmark } from "@/components/ui/wordmark";

/**
 * Ana gezinti: solda yalnızca simgeli dikey çubuk (Instantly'deki gibi). Her simge bir uygulamadır; uygulamanın kendi
 * alt görünümleri sayfanın üst çubuğunda sekme olarak durur. Dar ekranda alt çubuğa dönüşür.
 */
const items = [
  { label: "Ana sayfa", href: "/panel", exact: true, icon: HomeIcon, prefixes: [] as string[] },
  { label: "Müşteri", href: "/panel/musteri-bul", icon: MapPinIcon, prefixes: ["/panel/musteri", "/panel/musteri-bul", "/panel/firmalar", "/panel/calis", "/panel/plan"] },
  { label: "Kişiler", href: "/panel/kisi-bul", icon: UsersIcon, prefixes: ["/panel/kisi-bul", "/panel/kisiler"] },
  { label: "Kampanyalar", href: "/panel/kampanyalar", icon: SendIcon, prefixes: ["/panel/kampanyalar", "/panel/otomasyon"] },
  { label: "Gönderici adresleri", href: "/panel/posta-kutulari", icon: MailIcon, prefixes: ["/panel/posta-kutulari"] },
] as const;

export function AppRail({ account }: { account: ReactNode }) {
  const path = usePathname();
  return (
    <>
      <aside className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-around border-t border-line bg-paper px-2 md:inset-y-0 md:right-auto md:h-auto md:w-14 md:flex-col md:justify-start md:gap-1 md:border-t-0 md:border-r md:px-0 md:py-3">
        <Link href="/panel" aria-label="Adspine ana sayfa" className="hidden size-10 place-items-center rounded-control md:mb-3 md:grid">
          <Wordmark textClassName="hidden" />
        </Link>

        <nav aria-label="Ana menü" className="contents">
          {items.map((it) => {
            const active = "exact" in it && it.exact ? path === it.href : it.prefixes.some((p) => path === p || path.startsWith(`${p}/`));
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-label={it.label}
                aria-current={active ? "page" : undefined}
                className="group relative grid size-11 place-items-center rounded-control text-muted transition-colors hover:bg-sunken hover:text-ink aria-[current=page]:bg-forest-soft aria-[current=page]:text-accent md:size-10"
              >
                <Icon size={20} />
                {/* Simge çubuğu etiketsiz olduğundan ad, üzerine gelince yan tarafta görünür. */}
                <span role="tooltip" className="pointer-events-none absolute left-full ml-2 hidden origin-left scale-95 rounded-control bg-ink px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-paper opacity-0 shadow-float transition-[opacity,transform] group-hover:opacity-100 group-focus-visible:opacity-100 md:block md:group-hover:scale-100 md:group-focus-visible:scale-100">
                  {it.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="md:mt-auto">{account}</div>
      </aside>
    </>
  );
}
