import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { OutreachUnavailableError } from "@/modules/outreach/contacts";
import { loadReports, type ReportsData } from "@/modules/outreach/reports";
import { getProfile } from "@/modules/profile/repository";
import { ReportsSkeleton } from "../../../_components/skeletons";
import { ReportsWorkspace } from "./_components/reports-workspace";

export const metadata: Metadata = { title: "Raporlar" };

async function Content() {
  const user = await requireUser();
  if (!(await getProfile(user.uid))) redirect("/onboarding");

  let data: ReportsData | null = null;
  try {
    data = await loadReports(user.uid, 30);
  } catch (e) {
    if (!(e instanceof OutreachUnavailableError)) throw e;
  }
  if (!data) {
    return (
      <div role="status" className="grid justify-items-center gap-3 rounded-panel bg-surface px-6 py-16 text-center ring-1 ring-line">
        <p className="text-lg font-semibold tracking-tight">Raporlar henüz etkinleştirilmedi</p>
        <p className="max-w-[30rem] text-muted">Bu bölüm için veritabanı güncellemesi gerekiyor. Kısa süre sonra tekrar deneyin.</p>
      </div>
    );
  }
  return <ReportsWorkspace initial={data} />;
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportsSkeleton />}>
      <Content />
    </Suspense>
  );
}
