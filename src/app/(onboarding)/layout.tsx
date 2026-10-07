import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Onboarding tam ekran, tek odaklı: panel menüsü yok. Yerleşimi sihirbazın kendisi kurar. */
export default function OnboardingLayout({ children }: LayoutProps<"/">) {
  return <div className="flex min-h-dvh flex-1 flex-col">{children}</div>;
}
