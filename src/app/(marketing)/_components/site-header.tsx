import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";

const nav = [
  { href: "/#nasil-calisir", label: "Nasıl çalışır" },
  { href: "/#puanlama", label: "Puanlama" },
  { href: "/#ozellikler", label: "Özellikler" },
  { href: "/#sss", label: "Sorular" },
];

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-page items-center justify-between gap-6 px-4 py-5 sm:px-6">
      <Link href="/" aria-label="Sinyal ana sayfa" className="rounded-control">
        <Wordmark />
      </Link>
      <nav aria-label="Ana menü" className="hidden md:block">
        <ul className="flex gap-1 text-sm text-muted">
          {nav.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="rounded-control px-3 py-2 transition-colors hover:text-ink">
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
    </header>
  );
}
