import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type CSSProperties } from "react";
import { ModulePreview } from "@/components/showcase/previews";
import styles from "@/components/showcase/showcase.module.css";
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/modules/profile/repository";
import { appModules } from "@/modules/registry";

export const metadata: Metadata = { title: "Panel" };

/** Giriş sonrası ana özellikler. Her kart, ilgili bölümün karşılama sayfasına gider. */
const features = [
  {
    id: "musteri",
    name: "Müşteri",
    href: "/panel/musteri",
    preview: "musteri-bul",
    description: "Bölgenizdeki firmaları bulun, hedef profilinize göre puanlayın ve ilgilendiklerinizi takip edin.",
    parts: ["Müşteri bul", "Takip et", "İletişim kur"],
  },
  {
    id: "calis",
    name: "İletişim kur",
    href: "/panel/calis",
    preview: "calis",
    description: "Seçtiğiniz müşteri için, bildiklerimizden yola çıkarak kişiselleştirilmiş mesaj ve e-posta taslakları hazırlayın.",
    parts: ["Mesaj", "E-posta"],
  },
] as const;

const upcoming = appModules.filter((m) => m.status === "soon");

const idx = (i: number) => ({ "--i": i }) as CSSProperties;

async function PanelHeading() {
  const user = await requireUser();
  const profile = await getProfile(user.uid);
  if (!profile) redirect("/onboarding");

  const firstName = user.name?.split(" ")[0];
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {firstName ? `Merhaba ${firstName}` : "Merhaba"}
      </h1>
      <p className="mt-2 max-w-prose text-muted">{profile.businessName} için neyle başlamak istersiniz?</p>
    </>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export default function PanelPage() {
  return (
    <>
      <Suspense fallback={<div className="h-16 w-64 rounded-control bg-sunken" />}>
        <PanelHeading />
      </Suspense>

      <ul className="mt-10 grid gap-6 lg:grid-cols-2">
        {features.map((f, i) => (
          <li key={f.id} style={idx(i)} className={styles.item}>
            <Link
              href={f.href}
              className="group block h-full overflow-hidden rounded-panel bg-surface ring-1 ring-line transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-float active:translate-y-0"
            >
              <div className={`${styles.stage} h-64 rounded-none! p-5 sm:p-6`}>
                <div className="max-w-md" aria-hidden="true">
                  <ModulePreview id={f.preview} />
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-forest to-transparent" />
              </div>
              <div className="grid gap-3 p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold tracking-tight">{f.name}</h2>
                  <span className="grid size-10 place-items-center rounded-full bg-sunken transition-[background-color,color,transform] duration-300 group-hover:translate-x-1 group-hover:bg-forest group-hover:text-white">
                    <Arrow />
                  </span>
                </div>
                <p className="max-w-prose text-muted">{f.description}</p>
                <ul className="flex flex-wrap gap-2" aria-label={`${f.name} bölümleri`}>
                  {f.parts.map((p) => (
                    <li key={p} className="rounded-full bg-sunken px-3 py-1 text-sm text-muted">
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-12" aria-labelledby="yakinda">
        <h2 id="yakinda" className="text-lg font-semibold tracking-tight">
          Yakında
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {upcoming.map((m, i) => (
            <li key={m.id} style={idx(i + features.length)} className={`${styles.item} rounded-panel bg-sunken/60 p-5 ring-1 ring-line`}>
              <h3 className="font-semibold">{m.name}</h3>
              <p className="mt-1.5 text-sm text-muted">{m.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
