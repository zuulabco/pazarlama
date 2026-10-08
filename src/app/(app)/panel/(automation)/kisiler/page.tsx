import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { listContacts, listLists, listSuppressions, OutreachUnavailableError, type ContactList, type Suppression } from "@/modules/outreach/contacts";
import type { Contact } from "@/modules/outreach/schema";
import { accountSummary, type AccountSummary } from "@/modules/outreach/usage";
import { getProfile } from "@/modules/profile/repository";
import { PageSkeleton } from "../../../_components/skeletons";
import { ContactsWorkspace } from "./_components/contacts-workspace";

export const metadata: Metadata = { title: "Kişiler" };

async function Content() {
  const user = await requireUser();
  if (!(await getProfile(user.uid))) redirect("/onboarding");

  let contacts: Contact[] = [];
  let total = 0;
  let lists: ContactList[] = [];
  let suppressions: Suppression[] = [];
  let account: AccountSummary | null = null;
  let unavailable = false;
  try {
    const [first, l, s, a] = await Promise.all([listContacts(user.uid, { page: 1 }), listLists(user.uid), listSuppressions(user.uid), accountSummary(user.uid)]);
    account = a;
    contacts = first.contacts;
    total = first.total;
    lists = l;
    suppressions = s;
  } catch (e) {
    if (!(e instanceof OutreachUnavailableError)) throw e;
    unavailable = true;
  }

  return <ContactsWorkspace initialContacts={contacts} initialTotal={total} initialLists={lists} initialSuppressions={suppressions} initialAccount={account} unavailable={unavailable} />;
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}
