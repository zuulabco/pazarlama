import type { Metadata } from "next";
import Link from "next/link";
import { OneTapGate } from "@/components/auth/one-tap-gate";
import { Wordmark } from "@/components/ui/wordmark";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col px-4 py-6 sm:px-6">
      <OneTapGate />
      <Link href="/" aria-label="Adspine ana sayfa" className="self-start rounded-control">
        <Wordmark />
      </Link>
      <main className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-[25rem]">{children}</div>
      </main>
    </div>
  );
}
