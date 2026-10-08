import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { OutreachUnavailableError } from "@/modules/outreach/contacts";
import type { Mailbox } from "@/modules/outreach/mailbox-schema";
import { googleConfigured } from "@/modules/outreach/gmail";
import { listMailboxes } from "@/modules/outreach/mailboxes";
import { accountSummary } from "@/modules/outreach/usage";
import { getProfile } from "@/modules/profile/repository";
import { ListSkeleton } from "../../../_components/skeletons";
import { MailboxesWorkspace } from "./_components/mailboxes-workspace";

export const metadata: Metadata = { title: "Gönderici adresleri" };

async function Content() {
  const user = await requireUser();
  if (!(await getProfile(user.uid))) redirect("/onboarding");

  let mailboxes: Mailbox[] = [];
  let plan: { label: string; senders: number } | null = null;
  let unavailable = false;
  try {
    mailboxes = await listMailboxes(user.uid);
    plan = await accountSummary(user.uid).then((a) => ({ label: a.plan.label, senders: a.plan.senders }), () => null);
  } catch (e) {
    if (!(e instanceof OutreachUnavailableError)) throw e;
    unavailable = true;
  }

  const encryptionReady = Buffer.from((process.env.OUTREACH_ENC_KEY ?? "").replace(/^"|"$/g, ""), "base64").length === 32;
  return <MailboxesWorkspace initial={mailboxes} unavailable={unavailable} encryptionReady={encryptionReady} googleReady={googleConfigured()} plan={plan} />;
}

export default function MailboxesPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Content />
    </Suspense>
  );
}
