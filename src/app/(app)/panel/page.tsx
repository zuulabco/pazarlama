import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { OutreachUnavailableError } from "@/modules/outreach/contacts";
import { loadHome, type HomeData } from "@/modules/outreach/home";
import { attention, setupSteps } from "@/modules/outreach/home-rules";
import { getProfile } from "@/modules/profile/repository";
import { SectionTabs } from "../_components/section-tabs";
import { DashboardSkeleton } from "../_components/skeletons";

export const metadata: Metadata = { title: "Panel" };

const num = (n: number) => new Intl.NumberFormat("tr-TR").format(n);
const rate = (r: number) => `%${r.toFixed(1).replace(".", ",").replace(/,0$/, "")}`;
const when = (iso: string) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(new Date(iso));

const card = "rounded-panel bg-surface ring-1 ring-line";

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={`${card} p-5`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Hat: kişi → kampanya → yanıt → toplantı. Her halka ilgili sayfaya gider; bölümlerin birbirine bağlı olduğunu gösterir. */
function Pipeline({ p }: { p: HomeData["pipeline"] }) {
  const items = [
    { label: "Kayıtlı kişi", value: p.contacts, href: "/panel/kisiler", hint: "Kişi bul ile eklenir" },
    { label: "Kampanyada", value: p.inCampaign, href: "/panel/kampanyalar", hint: "Sırası gelen kişiler" },
    { label: "Yanıt (30 gün)", value: p.replies, href: "/panel/gelen-kutusu", hint: "Gelen kutusunda" },
    { label: "Toplantı (30 gün)", value: p.meetings, href: "/panel/raporlar", hint: "Planlanan ve kazanılan" },
  ];
  return (
    <ol className="grid gap-3 md:grid-cols-4" aria-label="Satış hattı">
      {items.map((it, i) => (
        <li key={it.label} className="relative">
          <Link href={it.href} className={`${card} group block p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-float`}>
            <p className="text-sm text-muted">{it.label}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{num(it.value)}</p>
            <p className="mt-1 text-xs text-muted">{it.hint}</p>
          </Link>
          {i < items.length - 1 && (
            <span aria-hidden="true" className="absolute top-1/2 -right-3 z-10 hidden size-6 -translate-y-1/2 place-items-center rounded-full bg-paper text-muted ring-1 ring-line md:grid">
              <Arrow />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function Setup({ data }: { data: HomeData }) {
  const steps = setupSteps(data.facts);
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const next = steps.find((s) => !s.done)!;
  return (
    <Section title="Başlangıç adımları" action={<span className="text-sm text-muted tabular-nums">{done} / {steps.length} tamamlandı</span>}>
      <div role="progressbar" aria-label="Kurulum ilerlemesi" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done} className="mb-4 h-1.5 overflow-hidden rounded-full bg-sunken">
        <div className="h-full rounded-full bg-forest transition-[width] duration-500" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="grid gap-1">
        {steps.map((s) => (
          <li key={s.key} className={`flex items-start gap-3 rounded-control p-3 ${s === next ? "bg-forest-soft" : ""}`}>
            <span aria-hidden="true" className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white ${s.done ? "bg-forest" : "bg-transparent ring-1 ring-line-strong"}`}>
              {s.done && <Check />}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${s.done ? "text-muted line-through" : ""}`}>{s.title}</p>
              {!s.done && <p className="mt-0.5 text-sm text-muted">{s.hint}</p>}
            </div>
            {s === next && (
              <ButtonLink href={s.href} className="h-9">
                {s.cta}
              </ButtonLink>
            )}
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Attention({ data }: { data: HomeData }) {
  const items = attention(data.facts);
  if (items.length === 0) return null;
  const tone = { danger: "bg-danger-soft text-danger", warn: "bg-pollen text-ink", info: "bg-forest-soft text-ink" } as const;
  return (
    <Section title="Dikkat edilecekler">
      <ul className="grid gap-2">
        {items.map((a) => (
          <li key={a.key} className={`flex flex-wrap items-center justify-between gap-3 rounded-control px-4 py-3 text-sm ${tone[a.tone]}`}>
            <span>{a.text}</span>
            <Link href={a.href} className="font-medium underline underline-offset-4 hover:no-underline">
              {a.cta}
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Performance({ data }: { data: HomeData }) {
  const o = data.reports.overview;
  const rows = [
    { label: "Gönderilen", value: num(o.totals.sent) },
    { label: "Yanıt oranı", value: rate(o.rates.reply) },
    { label: "Geri dönen", value: rate(o.rates.bounce), bad: o.totals.sent >= 20 && o.rates.bounce >= 5.5 },
    { label: "Kalan kredi", value: num(data.account.credits), sub: data.account.plan.label },
  ];
  const max = Math.max(...o.daily.map((d) => d.sent), 1);
  return (
    <Section title="Son 30 gün" action={<Link href="/panel/raporlar" className="text-sm text-accent underline underline-offset-4 hover:no-underline">Tüm raporlar</Link>}>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-sm text-muted">{r.label}</dt>
            <dd className={`text-2xl font-semibold tracking-tight tabular-nums ${r.bad ? "text-danger" : ""}`}>{r.value}</dd>
            {r.sub && <p className="text-xs text-muted">{r.sub}</p>}
          </div>
        ))}
      </dl>
      {o.totals.sent > 0 && (
        <div role="img" aria-label="Son 30 günün günlük gönderimi" className="mt-5 flex h-16 items-end gap-[3px]">
          {o.daily.map((d) => (
            <div key={d.date} title={`${d.date}: ${d.sent} gönderilen`} className="flex-1 rounded-t-[3px] bg-forest/60" style={{ height: `${(d.sent / max) * 100}%`, minHeight: d.sent ? 2 : 0 }} />
          ))}
        </div>
      )}
    </Section>
  );
}

function Customer({ c }: { c: HomeData["customer"] }) {
  return (
    <Section title="Yerel firmalar" action={<Link href="/panel/musteri" className="text-sm text-accent underline underline-offset-4 hover:no-underline">Bölüme git</Link>}>
      <p className="text-sm text-muted">Bölgenizdeki firmaları bulun, takip edin ve onlara mesaj yazın.</p>
      <p className="mt-3 text-sm">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{num(c.tracked)}</span> <span className="text-muted">takipteki firma</span>
      </p>
      {c.upcoming.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {c.upcoming.map((p) => (
            <li key={p.id} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                {p.title}
                {p.withName && <span className="text-muted"> · {p.withName}</span>}
              </span>
              <time className="shrink-0 text-muted">{when(p.startsAt)}</time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">Yaklaşan randevu ya da görev yok.</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink href="/panel/musteri-bul" className="h-9" variant="secondary">
          Firma bul
        </ButtonLink>
        <ButtonLink href="/panel/calis" className="h-9" variant="secondary">
          Mesaj yaz
        </ButtonLink>
        <ButtonLink href="/panel/plan" className="h-9" variant="secondary">
          Takvim
        </ButtonLink>
      </div>
    </Section>
  );
}

async function PanelContent() {
  const user = await requireUser();
  const profile = await getProfile(user.uid);
  if (!profile) redirect("/onboarding");

  let data: HomeData | null = null;
  try {
    data = await loadHome(user.uid);
  } catch (e) {
    if (!(e instanceof OutreachUnavailableError)) throw e;
  }

  const firstName = user.name?.split(" ")[0];
  return (
    <>
      <SectionTabs title="Ana sayfa" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{firstName ? `Merhaba ${firstName}` : "Merhaba"}</h2>
          <p className="mt-1 text-muted">{profile.businessName} · bugünün özeti</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/panel/kisi-bul" variant="secondary">
            Kişi bul
          </ButtonLink>
          <ButtonLink href="/panel/kampanyalar">Yeni kampanya</ButtonLink>
        </div>
      </div>

      {data ? (
        <div className="mt-6 grid gap-5">
          <Pipeline p={data.pipeline} />
          <Attention data={data} />
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="grid gap-5">
              <Setup data={data} />
              <Performance data={data} />
            </div>
            <Customer c={data.customer} />
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <Customer c={{ tracked: 0, upcoming: [] }} />
        </div>
      )}
    </>
  );
}

export default function PanelPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <PanelContent />
    </Suspense>
  );
}
