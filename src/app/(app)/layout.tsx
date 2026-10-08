import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Wordmark } from "@/components/ui/wordmark";
import { AppNav } from "./_components/app-nav";
import { ThemeScope } from "./_components/theme-scope";
import { UserMenu } from "./_components/user-menu";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <ThemeScope />
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-page items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-6">
            <Link href="/panel" aria-label="Panel" className="rounded-control">
              <Wordmark textClassName="hidden sm:inline" />
            </Link>
            <Suspense fallback={null}>
              <AppNav />
            </Suspense>
          </div>
          <Suspense fallback={<span className="size-10 rounded-full bg-sunken" />}>
            <UserMenu />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-page flex-1 px-4 py-10 sm:px-6">{children}</main>
    </>
  );
}
