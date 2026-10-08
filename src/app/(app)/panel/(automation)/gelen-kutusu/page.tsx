import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { OutreachUnavailableError } from "@/modules/outreach/contacts";
import { listMailboxes } from "@/modules/outreach/mailboxes";
import { listSequences } from "@/modules/outreach/sequences";
import { listConversations } from "@/modules/outreach/unibox";
import { getProfile } from "@/modules/profile/repository";
import { PageSkeleton } from "../../../_components/skeletons";
import { InboxWorkspace } from "./_components/inbox-workspace";

export const metadata: Metadata = { title: "Gelen kutusu" };

async function Content() {
  const user = await requireUser();
  if (!(await getProfile(user.uid))) redirect("/onboarding");

  let data: Awaited<ReturnType<typeof listConversations>> | null = null;
  let campaigns: { id: string; label: string }[] = [];
  let mailboxes: { id: string; label: string }[] = [];
  try {
    const [inbox, sequences, boxes] = await Promise.all([listConversations(user.uid), listSequences(user.uid), listMailboxes(user.uid)]);
    data = inbox;
    campaigns = sequences.map((s) => ({ id: s.id, label: s.name }));
    mailboxes = boxes.map((m) => ({ id: m.id, label: m.email }));
  } catch (e) {
    if (!(e instanceof OutreachUnavailableError)) throw e;
  }

  if (!data) {
    return (
      <div role="status" className="grid justify-items-center gap-3 rounded-panel bg-surface px-6 py-16 text-center ring-1 ring-line">
        <p className="text-lg font-semibold tracking-tight">Gelen kutusu henüz etkinleştirilmedi</p>
        <p className="max-w-[30rem] text-muted">Bu bölüm için veritabanı güncellemesi gerekiyor. Kısa süre sonra tekrar deneyin.</p>
      </div>
    );
  }
  return <InboxWorkspace initial={data} campaigns={campaigns} mailboxes={mailboxes} />;
}

export default function InboxPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}
