import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { OutreachUnavailableError } from "@/modules/outreach/contacts";
import { listMailboxes } from "@/modules/outreach/mailboxes";
import { getSequence } from "@/modules/outreach/sequences";
import { getProfile } from "@/modules/profile/repository";
import { ListSkeleton } from "../../../../_components/skeletons";
import { CampaignWorkspace } from "./_components/campaign-workspace";

export const metadata: Metadata = { title: "Otomasyon" };

async function Content({ params }: { params: PageProps<"/panel/otomasyon/[id]">["params"] }) {
  const { id } = await params;
  const user = await requireUser();
  const profile = await getProfile(user.uid);
  if (!profile) redirect("/onboarding");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  let data: { seq: Awaited<ReturnType<typeof getSequence>>; boxes: Awaited<ReturnType<typeof listMailboxes>> } | null = null;
  try {
    data = { seq: await getSequence(user.uid, id), boxes: await listMailboxes(user.uid) };
  } catch (e) {
    if (!(e instanceof OutreachUnavailableError)) throw e;
  }
  if (!data?.seq) notFound();
  return <CampaignWorkspace initial={data.seq} mailboxes={data.boxes} sender={{ name: user.name ?? null, company: profile.businessName }} />;
}

export default function CampaignPage(props: PageProps<"/panel/otomasyon/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Content params={props.params} />
    </Suspense>
  );
}
