import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { draftFrom } from "@/modules/profile/draft";
import { getProfile } from "@/modules/profile/repository";
import { computeWeights, criteria } from "@/modules/profile/weights";
import { ProfileSections } from "./_components/profile-sections";

export const metadata: Metadata = { title: "Profilim" };

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" });

async function ProfileContent() {
  const user = await requireUser();
  const profile = await getProfile(user.uid);
  if (!profile) redirect("/onboarding");

  const weights = computeWeights(profile);
  const top = Math.max(...Object.values(weights));
  const emphasize = top - Math.min(...Object.values(weights)) >= 3;
  const initials = profile.businessName.trim().slice(0, 2).toLocaleUpperCase("tr");

  return (
    <>
      <header className="flex items-center gap-5">
        <span
          aria-hidden="true"
          className="grid size-16 shrink-0 place-items-center rounded-full bg-forest text-xl font-semibold text-pollen"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{profile.businessName}</h1>
          <p className="truncate text-muted">{user.email}</p>
        </div>
      </header>
      <p className="mt-6 mb-8 max-w-prose text-muted">
        Hedef profiliniz, her aramada firmaları puanlamak için kullanılır. Burada yaptığınız değişiklikler bundan sonraki
        aramalara yansır; önceki aramaların puanları değişmez.
      </p>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <ProfileSections profile={draftFrom(profile)} />

        <aside className="grid gap-5 lg:sticky lg:top-6">
          <section aria-labelledby="weights-title" className="rounded-panel bg-surface p-6 ring-1 ring-line">
            <h2 id="weights-title" className="text-base font-semibold tracking-tight">
              Puanlama öncelikleriniz
            </h2>
            <p className="mt-1 mb-5 text-sm text-muted">Profilinize göre otomatik hesaplanır.</p>
            <dl className="grid gap-3.5">
              {criteria.map((c) => (
                <div key={c.key} className="grid gap-1.5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted">{c.label}</dt>
                    <dd className="font-medium tabular-nums">{weights[c.key]}</dd>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
                    <div
                      className={`h-full rounded-full ${emphasize && weights[c.key] === top ? "bg-forest" : "bg-score-mid"}`}
                      style={{ width: `${(weights[c.key] / top) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </dl>
          </section>

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
    <Suspense fallback={<div className="h-96 rounded-panel bg-sunken" aria-hidden="true" />}>
      <ProfileContent />
    </Suspense>
  );
}
