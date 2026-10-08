import type { Metadata } from "next";
import { Suspense } from "react";
import { AppRail } from "./_components/app-rail";
import { AssistantPanel } from "./_components/assistant-panel";
import { ThemeScope } from "./_components/theme-scope";
import { UserMenu } from "./_components/user-menu";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Giriş yapılmış alanın kabuğu: solda simge çubuğu, sağda tam genişlikte içerik. Her sayfa kendi üst çubuğunu
 * (başlık + sekmeler) çizer; ortak çerçeve burada yoktur.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="app-shell min-h-svh bg-paper text-ink">
      <ThemeScope />
      <Suspense fallback={null}>
        <AppRail
          account={
            <Suspense fallback={<span className="block size-10 rounded-full bg-sunken" />}>
              <UserMenu />
            </Suspense>
          }
        />
      </Suspense>
      <AssistantPanel />
      <main className="min-h-svh px-4 pb-20 sm:px-6 md:pb-8 md:pl-[calc(3.5rem+1.5rem)] md:pr-6">{children}</main>
    </div>
  );
}
