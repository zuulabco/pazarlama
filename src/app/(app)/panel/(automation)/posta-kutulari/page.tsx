import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { OutreachUnavailableError } from "@/modules/outreach/contacts";
import type { Mailbox } from "@/modules/outreach/mailbox-schema";
import { listMailboxes } from "@/modules/outreach/mailboxes";
import { getProfile } from "@/modules/profile/repository";
import { PageSkeleton } from "../../../_components/skeletons";
import { MailboxesWorkspace } from "./_components/mailboxes-workspace";

export const metadata: Metadata = { title: "Posta kutuları" };

async function Content() {
  const user = await requireUser();
  if (!(await getProfile(user.uid))) redirect("/onboarding");

  let mailboxes: Mailbox[] = [];
  let unavailable = false;
  try {
    mailboxes = await listMailboxes(user.uid);
  } catch (e) {
    if (!(e instanceof OutreachUnavailableError)) throw e;
    unavailable = true;
  }

  const encryptionReady = Buffer.from((process.env.OUTREACH_ENC_KEY ?? "").replace(/^"|"$/g, ""), "base64").length === 32;
  return <MailboxesWorkspace initial={mailboxes} unavailable={unavailable} encryptionReady={encryptionReady} />;
}

export default function MailboxesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}
