"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Ana özellik sekmeleri. Her sekme, kendi alt sayfalarını (bölüm sekmeleri) kapsar. */
const sections = [
  { label: "Müşteri", href: "/panel/musteri", prefixes: ["/panel/musteri", "/panel/musteri-bul", "/panel/firmalar", "/panel/calis"] },
] as const;

export function AppNav() {
  const path = usePathname();
  return (
    <nav aria-label="Ana menü" className="min-w-0">
      <ul className="flex gap-1">
        {sections.map((s) => {
          const active = s.prefixes.some((p) => path === p || path.startsWith(`${p}/`));
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className="block rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:text-ink aria-[current=page]:bg-sunken aria-[current=page]:text-ink"
              >
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
