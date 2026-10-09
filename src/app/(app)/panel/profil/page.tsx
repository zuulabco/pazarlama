import { SectionTabs } from "../../_components/section-tabs";
import { PageSkeleton } from "../../_components/skeletons";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { draftFrom } from "@/modules/profile/draft";
import { getProfile } from "@/modules/profile/repository";
import { ProfileSections } from "./_components/profile-sections";

export const metadata: Metadata = { title: "Profilim" };

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" });

async function ProfileContent() {
  const user = await requireUser();
  const profile = await getProfile(user.uid);
  if (!profile) redirect("/onboarding");

  const initials = profile.businessName.trim().slice(0, 2).toLocaleUpperCase("tr");

  return (
    <>
      <SectionTabs title="Profil" />
      <header className="flex items-center gap-5">
        <span
          aria-hidden="true"
          className="grid size-16 shrink-0 place-items-center rounded-full bg-forest text-xl font-semibold text-white"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold tracking-tight">{profile.businessName}</h2>
          <p className="truncate text-muted">{user.email}</p>
        </div>
      </header>
      <p className="mt-6 mb-8 max-w-prose text-muted">
        Hedef profiliniz, Adspine AI&apos;nın size uygun mesajlar yazması ve arama önerileri vermesi için kullanılır.
      </p>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <ProfileSections profile={draftFrom(profile)} />

        <aside className="grid gap-5 lg:sticky lg:top-6">
          <section aria-labelledby="account-title" className="rounded-panel bg-surface p-6 ring-1 ring-line">
            <h2 id="account-title" className="text-base font-semibold tracking-tight">
              Hesap
            </h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-muted">E-posta</dt>
                <dd className="mt-0.5 font-medium break-all">{user.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Kurulum tarihi</dt>
                <dd className="mt-0.5 font-medium">{dateFormat.format(new Date(profile.completedAt))}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
