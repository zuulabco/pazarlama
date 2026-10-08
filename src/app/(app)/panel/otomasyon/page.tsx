import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/modules/profile/repository";
import { PageSkeleton } from "../../_components/skeletons";

export const metadata: Metadata = { title: "Otomasyon" };

const steps = [
  { title: "Kişileri toplayın", text: "Takipteki firmaların web sitelerinden e-posta adreslerini bulun, CSV yükleyin ya da elle ekleyin." },
  { title: "Posta kutunuzu bağlayın ve ısındırın", text: "Kendi e-posta adresinizi bağlayın; Adspine hacmi kademeli artırır ve alan adınızın ayarlarını denetler.", soon: true },
  { title: "Kampanyayı kurun", text: "Çok adımlı e-posta dizisi hazırlayın; metinleri yapay zekâ yazsın ya da kendiniz yazın.", soon: true },
  { title: "Yanıtları yönetin", text: "Yanıt gelince dizi durur, abonelikten çıkanlar otomatik kara listeye girer.", soon: true },
];

async function Welcome() {
  const user = await requireUser();
  if (!(await getProfile(user.uid))) redirect("/onboarding");

  return (
    <section className="grid min-h-[calc(100svh-11rem)] items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-display lg:tracking-display">Soğuk e-postadan toplantıya</h1>
        <p className="mt-6 max-w-prose text-lg text-muted">
          Potansiyel müşterilerinizin e-postalarını bulun, kendi posta kutunuzdan otomatik e-posta dizileri gönderin ve yanıtları tek yerden yönetin.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/panel/kisiler" size="lg">
            Kişilere git
          </ButtonLink>
        </div>
      </div>

      <ol className="grid gap-3" aria-label="Nasıl çalışır">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-panel bg-surface p-5 ring-1 ring-line">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-forest-soft text-sm font-semibold text-forest">{s.soon ? i + 1 : <CheckIcon size={16} />}</span>
            <div>
              <h2 className="font-semibold tracking-tight">
                {s.title}
                {s.soon && <span className="ml-2 rounded-full bg-sunken px-2 py-0.5 text-xs font-normal text-muted">Yakında</span>}
              </h2>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function AutomationWelcomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Welcome />
    </Suspense>
  );
}
