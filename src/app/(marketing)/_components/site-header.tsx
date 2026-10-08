"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";

const nav = [
  { href: "/#bul", label: "Bul" },
  { href: "/#ulas", label: "Ulaş" },
  { href: "/#adspine-ai", label: "Adspine AI" },
  { href: "/#paketler", label: "Paketler" },
  { href: "/#sss", label: "Sorular" },
];

function subscribe(cb: () => void) {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
}
const scrolled = () => window.scrollY > 12;

/**
 * Üst menü: sayfa kaydırılırken üstte kalır; yarı saydam, bulanık (glassmorphism) bir yüzeyle içeriğin üzerinde durur.
 * En üstteyken neredeyse görünmez, kaydırınca sınır ve gölge kazanır.
 */
export function SiteHeader() {
  const down = useSyncExternalStore(subscribe, scrolled, () => false);
  return (
    <header className="sticky top-0 z-50 w-full px-3 pt-3 sm:px-6">
      <div
        data-scrolled={down}
        className="mx-auto flex w-full max-w-page items-center justify-between gap-6 rounded-panel border border-transparent px-4 py-2.5 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 data-[scrolled=true]:border-white/40 data-[scrolled=true]:bg-surface/55 data-[scrolled=true]:shadow-float data-[scrolled=true]:backdrop-blur-xl data-[scrolled=true]:backdrop-saturate-150"
      >
        <Link href="/" aria-label="Adspine ana sayfa" className="rounded-control">
          <Wordmark />
        </Link>
        <nav aria-label="Ana menü" className="hidden md:block">
          <ul className="flex gap-1 text-sm text-muted">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="rounded-control px-3 py-2 transition-colors hover:bg-ink/5 hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1">
          <ButtonLink href="/giris" variant="quiet" className="hidden sm:inline-flex">
            Giriş yap
          </ButtonLink>
          <ButtonLink href="/kayit">Hesap oluştur</ButtonLink>
        </div>
      </div>
    </header>
  );
}
