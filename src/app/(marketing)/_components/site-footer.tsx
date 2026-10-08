import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";

export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-page flex-col gap-4 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <Wordmark className="text-base text-ink" />
      <div className="flex gap-6">
        <Link href="/giris" className="hover:text-ink">
          Giriş yap
        </Link>
        <Link href="/kayit" className="hover:text-ink">
          Hesap oluştur
        </Link>
        <Link href="/gizlilik" className="hover:text-ink">
          Gizlilik ve KVKK
        </Link>
      </div>
      <p>© 2026 Adspine</p>
    </footer>
  );
}
