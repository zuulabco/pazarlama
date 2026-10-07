import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Wordmark } from "@/components/ui/wordmark";
import { UserMenu } from "./_components/user-menu";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-page items-center justify-between gap-6 px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-6">
            <Link href="/panel" aria-label="Panel" className="rounded-control">
              <Wordmark />
            </Link>
            <nav aria-label="Ana menü">
              <ul className="flex gap-1 text-sm text-muted">
                <li>
                  <Link href="/panel/musteri-bul" className="rounded-control px-3 py-2 transition-colors hover:text-ink">
                    Müşteri bul
                  </Link>
                </li>
                <li>
                  <Link href="/onboarding?edit=1" className="rounded-control px-3 py-2 transition-colors hover:text-ink">
                    Bilgi kartım
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          <Suspense fallback={<span className="h-10 w-28 rounded-control bg-sunken" />}>
            <UserMenu />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-page flex-1 px-4 py-10 sm:px-6">{children}</main>
    </>
  );
}
