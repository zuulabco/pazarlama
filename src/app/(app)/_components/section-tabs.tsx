"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Bir ana özelliğin başlığı ve kendi alt sayfaları (örn. Müşteri → Müşteri bul, Takip). */
export function SectionTabs({ title, tabs }: { title: string; tabs: readonly { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <div className="mb-8 grid gap-4">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <nav aria-label={`${title} bölümleri`} className="flex gap-1 border-b border-line">
        {tabs.map((t) => {
          const active = path === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className="relative -mb-px border-b-2 border-transparent px-4 py-3 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:text-ink aria-[current=page]:border-forest aria-[current=page]:text-ink"
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Müşteri bölümünün sekmeleri. */
export const customerTabs = [
  { href: "/panel/musteri-bul", label: "Müşteri bul" },
  { href: "/panel/firmalar", label: "Takip" },
] as const;
