import { PageSkeleton } from "../../_components/skeletons";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { ModulePreview } from "@/components/showcase/previews";
import styles from "@/components/showcase/showcase.module.css";
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/modules/profile/repository";

export const metadata: Metadata = { title: "Müşteri" };

async function Welcome() {
  const user = await requireUser();
  if (!(await getProfile(user.uid))) redirect("/onboarding");

  return (
    <section className="grid min-h-[calc(100svh-11rem)] items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-display lg:tracking-display">
          Doğru müşteriyi bulun, hiçbirini kaçırmayın
        </h1>
        <p className="mt-6 max-w-prose text-lg text-muted">
          Bölgenizdeki firmaları bulun, hedef profilinize göre puanlayın ve ilgilendiklerinizi takip edin.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/panel/musteri-bul" size="lg">
            Müşteri bul
          </ButtonLink>
          <ButtonLink href="/panel/firmalar" size="lg" variant="secondary">
            Takip et
          </ButtonLink>
          <ButtonLink href="/panel/calis" size="lg" variant="quiet">
            İletişim kur
          </ButtonLink>
        </div>
      </div>

      <div className={`${styles.stage} hidden p-8 lg:block`} aria-hidden="true">
        <ModulePreview id="musteri-bul" />
      </div>
    </section>
  );
}

export default function CustomerWelcomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Welcome />
    </Suspense>
  );
}
