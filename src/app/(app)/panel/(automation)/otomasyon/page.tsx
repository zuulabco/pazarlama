import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { OutreachUnavailableError } from "@/modules/outreach/contacts";
import type { SequenceSummary } from "@/modules/outreach/sequence-schema";
import { listSequences } from "@/modules/outreach/sequences";
import { getProfile } from "@/modules/profile/repository";
import { ListSkeleton } from "../../../_components/skeletons";
import { CampaignsList } from "./_components/campaigns-list";

export const metadata: Metadata = { title: "Otomasyon" };

async function Content() {
  const user = await requireUser();
  if (!(await getProfile(user.uid))) redirect("/onboarding");

  let items: SequenceSummary[] = [];
  let unavailable = false;
  try {
    items = await listSequences(user.uid);
  } catch (e) {
    if (!(e instanceof OutreachUnavailableError)) throw e;
    unavailable = true;
  }
  return <CampaignsList initial={items} unavailable={unavailable} />;
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Content />
    </Suspense>
  );
}
