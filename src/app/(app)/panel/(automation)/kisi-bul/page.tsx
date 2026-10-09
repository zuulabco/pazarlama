import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { OutreachUnavailableError } from "@/modules/outreach/contacts";
import { accountSummary, type AccountSummary } from "@/modules/outreach/usage";
import { getProfile } from "@/modules/profile/repository";
import { LeadsSkeleton } from "../../../_components/skeletons";
import { LeadSearchWorkspace } from "./_components/lead-search-workspace";

export const metadata: Metadata = { title: "Potansiyel müşterilerimi bul" };

async function Content({ searchParams }: { searchParams: PageProps<"/panel/kisi-bul">["searchParams"] }) {
  const user = await requireUser();
  if (!(await getProfile(user.uid))) redirect("/onboarding");

  let account: AccountSummary | null = null;
  try {
    account = await accountSummary(user.uid);
  } catch (e) {
    if (!(e instanceof OutreachUnavailableError)) throw e;
  }

  if (!account) {
    return (
      <div role="status" className="grid justify-items-center gap-3 rounded-panel bg-surface px-6 py-16 text-center ring-1 ring-line">
        <p className="text-lg font-semibold tracking-tight">Müşteri bul henüz etkinleştirilmedi</p>
        <p className="max-w-[30rem] text-muted">Bu bölüm için veritabanı güncellemesi gerekiyor. Kısa süre sonra tekrar deneyin.</p>
      </div>
    );
  }
  // Profilde ülke sorulmaz; hedef bölge Türkiye ya da Türkiye şehirleridir. İleride profile ülke eklenince buradan okunur.
  const defaultCountry = "turkey";
  // Adspine AI sohbetinden gelen arama isteği: sayfa açılır açılmaz filtreler hazırlanır ve arama başlar.
  const ara = (await searchParams).ara;
  const initialAsk = typeof ara === "string" && ara.trim().length >= 4 ? ara.trim().slice(0, 400) : null;
  return <LeadSearchWorkspace key={initialAsk ?? "yeni"} initialAccount={account} defaultCountry={defaultCountry} initialAsk={initialAsk} />;
}

export default function LeadSearchPage(props: PageProps<"/panel/kisi-bul">) {
  return (
    <Suspense fallback={<LeadsSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
