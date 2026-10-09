import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { listContactPicks, OutreachUnavailableError, type ContactPick } from "@/modules/outreach/contacts";
import { getProfile } from "@/modules/profile/repository";
import { serviceLabel } from "@/modules/work/context";
import { ComposerSkeleton } from "../../../_components/skeletons";
import { WorkWorkspace } from "./_components/work-workspace";

export const metadata: Metadata = { title: "Mesaj hazırla" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

async function Content({ searchParams }: { searchParams: PageProps<"/panel/calis">["searchParams"] }) {
  const user = await requireUser();
  const profile = await getProfile(user.uid);
  if (!profile) redirect("/onboarding");

  let contacts: ContactPick[] = [];
  try {
    contacts = await listContactPicks(user.uid);
  } catch (e) {
    if (!(e instanceof OutreachUnavailableError)) throw e;
  }

  const sp = await searchParams;
  const kisiId = one(sp.kisi);

  return (
    <WorkWorkspace
      contacts={contacts}
      initialContactId={kisiId && contacts.some((c) => c.id === kisiId) ? kisiId : null}
      initialKind={one(sp.arac) === "email" ? "email" : "message"}
      services={profile.services.map((value) => ({ value, label: serviceLabel(value) }))}
      suggestedService={profile.services[0] ?? null}
    />
  );
}

export default function WorkPage(props: PageProps<"/panel/calis">) {
  return (
    <Suspense fallback={<ComposerSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
