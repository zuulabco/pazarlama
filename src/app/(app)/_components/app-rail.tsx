"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CalendarIcon, HomeIcon, MailIcon } from "@/components/ui/icons";
import { sections } from "./nav-config";
import { Wordmark } from "@/components/ui/wordmark";

type Item = { label: string; href: string; icon: typeof HomeIcon; prefixes: readonly string[]; exact?: boolean };

/**
 * Ana gezinti: solda yalnızca simgeli dikey çubuk. Ana sayfa, iki iş akışı bölümü (Bul, Ulaş: her biri kendi ikinci sol çubuğunu
 * açar) ve altta her yerden kullanılan araçlar (Takvim, Gönderici adresleri) ile hesap menüsü. Dar ekranda alt çubuğa dönüşür.
 */
const main: Item[] = [
  { label: "Ana sayfa", href: "/panel", exact: true, icon: HomeIcon, prefixes: [] },
  ...sections.map((s) => ({ label: s.label, href: s.href, icon: s.icon, prefixes: s.links.flatMap((l) => l.prefixes) })),
];

/** Alt kısım: belirli bir bölüme bağlı olmayan genel araçlar. */
const tools: Item[] = [
  { label: "Takvim", href: "/panel/plan", icon: CalendarIcon, prefixes: ["/panel/plan"] },
  { label: "Gönderici adresleri", href: "/panel/posta-kutulari", icon: MailIcon, prefixes: ["/panel/posta-kutulari"] },
];

function RailLink({ it, path }: { it: Item; path: string }) {
  const active = it.exact ? path === it.href : it.prefixes.some((p) => path === p || path.startsWith(`${p}/`));
  const Icon = it.icon;
  return (
    <Link
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
}

const divider = <span aria-hidden="true" className="hidden h-px w-6 bg-line md:my-1.5 md:block" />;

export function AppRail({ account }: { account: ReactNode }) {
  const path = usePathname();
  return (
    <aside className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-around overflow-x-auto border-t border-line bg-paper px-2 md:inset-y-0 md:right-auto md:h-auto md:w-14 md:flex-col md:justify-start md:gap-1 md:overflow-visible md:border-t-0 md:border-r md:px-0 md:py-3">
      <Link href="/panel" aria-label="Adspine ana sayfa" className="hidden size-10 place-items-center rounded-control md:mb-3 md:grid">
        <Wordmark textClassName="hidden" />
      </Link>

      <nav aria-label="Ana menü" className="contents">
        {main.map((it) => (
          <RailLink key={it.href} it={it} path={path} />
        ))}
      </nav>

      <nav aria-label="Genel araçlar" className="contents md:mt-auto md:flex md:flex-col md:items-center md:gap-1">
        {divider}
        {tools.map((it) => (
          <RailLink key={it.href} it={it} path={path} />
        ))}
      </nav>
      <div className="md:mt-1">{account}</div>
    </aside>
  );
}
