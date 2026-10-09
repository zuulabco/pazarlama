"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { hrefFor, matches, sectionOf } from "./nav-config";
import { useSectionCollapsed } from "./section-state";

/**
 * Bölüm kabuğu: Bul ve Ulaş sayfalarında ana simge çubuğunun yanında ikinci bir sol çubuk (bölümün alt sayfaları) çizer.
 * Çubuk, sayfa başlığının solundaki düğmeyle tamamen kapatılıp açılabilir (tercih bu tarayıcıda hatırlanır). Dar ekranda aynı
 * bağlantılar içeriğin üstünde yatay bir şerit olur. Diğer sayfalarda içerik olduğu gibi çizilir.
 */
export function SectionShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const section = sectionOf(path);
  const collapsed = useSectionCollapsed();

  if (!section) return children;

  return (
    <div className="md:flex">
      <aside
        id="section-sidebar"
        aria-label={`${section.label} bölümü`}
        inert={collapsed}
        className={`hidden shrink-0 overflow-hidden border-r border-line transition-[width,opacity] duration-200 md:sticky md:top-0 md:-ml-6 md:block md:h-svh md:self-start ${collapsed ? "md:w-0 md:border-r-0 md:opacity-0" : "md:w-52 md:opacity-100"}`}
      >
        <div className="w-52 px-3 py-5">
          <p className="px-3 text-xs font-semibold tracking-wide text-muted uppercase">{section.label}</p>
          <p className="mt-1 px-3 text-sm text-muted">{section.hint}</p>
          <nav aria-label={section.label} className="mt-4 grid gap-0.5">
            {section.links.map((l) => {
              const active = matches(path, l.prefixes);
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={hrefFor(l, path)}
                  aria-current={active ? "page" : undefined}
                  className="flex items-center gap-2.5 rounded-control px-3 py-2 text-sm text-muted transition-colors hover:bg-sunken hover:text-ink aria-[current=page]:bg-forest-soft aria-[current=page]:font-medium aria-[current=page]:text-accent"
                >
                  <Icon size={18} />
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 md:pl-6">
        <nav aria-label={section.label} className="-mx-4 mb-1 flex gap-1 overflow-x-auto border-b border-line px-4 py-2 sm:-mx-6 sm:px-6 md:hidden [scrollbar-width:none]">
          {section.links.map((l) => (
            <Link
              key={l.href}
              href={hrefFor(l, path)}
              aria-current={matches(path, l.prefixes) ? "page" : undefined}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-sm text-muted aria-[current=page]:bg-forest-soft aria-[current=page]:font-medium aria-[current=page]:text-accent"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}
