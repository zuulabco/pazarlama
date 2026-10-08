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
import { AiPrompt } from "../_components/ai-prompt";
import { SectionTabs } from "../_components/section-tabs";
import { DashboardSkeleton } from "../_components/skeletons";

export const metadata: Metadata = { title: "Panel" };

const num = (n: number) => new Intl.NumberFormat("tr-TR").format(n);
const rate = (r: number) => `%${r.toFixed(1).replace(".", ",").replace(/,0$/, "")}`;
const tz = "Europe/Istanbul";
const when = (iso: string) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(iso));
const ago = (iso: string) => {
  const m = Math.max(Math.round((Date.now() - Date.parse(iso)) / 60_000), 0);
  if (m < 60) return `${m || 1} dk önce`;
  if (m < 1440) return `${Math.round(m / 60)} sa önce`;
  return `${Math.round(m / 1440)} gün önce`;
};

const card = "rounded-panel bg-surface ring-1 ring-line";
const link = "text-sm text-accent underline underline-offset-4 hover:no-underline";

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

function Section({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${card} p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Kurulum adımları: tamamlanana kadar en üstte, sıradaki adım vurgulu. */
function Setup({ data }: { data: HomeData }) {
  const steps = setupSteps(data.facts);
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const next = steps.find((s) => !s.done)!;
  return (
    <section aria-label="Başlangıç adımları" className={`${card} p-5`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold tracking-tight">İlk gönderime giden yol</h2>
          <p className="text-sm text-muted">
            {done} / {steps.length} adım tamam · sıradaki: {next.title.toLocaleLowerCase("tr")}
          </p>
        </div>
        <ButtonLink href={next.href}>{next.cta}</ButtonLink>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {steps.map((s, i) => (
          <li key={s.key} className={`rounded-control p-3.5 ring-1 ${s === next ? "bg-forest-soft ring-forest/40" : "ring-line"}`}>
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${s.done ? "bg-forest text-white" : "bg-sunken text-muted"}`}>
                {s.done ? <Check /> : i + 1}
              </span>
              <Link href={s.href} className={`text-sm font-medium underline-offset-4 hover:underline ${s.done ? "text-muted line-through" : ""}`}>
                {s.title}
              </Link>
            </div>
            {!s.done && <p className="mt-2 text-xs text-muted">{s.hint}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Attention({ data }: { data: HomeData }) {
  const items = attention(data.facts);
  if (items.length === 0) return null;
  const tone = { danger: "bg-danger-soft text-danger", warn: "bg-pollen text-ink", info: "bg-forest-soft text-ink" } as const;
  return (
    <ul className="grid gap-2" aria-label="Dikkat edilecekler">
      {items.map((a) => (
        <li key={a.key} className={`flex flex-wrap items-center justify-between gap-3 rounded-control px-4 py-3 text-sm ${tone[a.tone]}`}>
          <span>{a.text}</span>
          <Link href={a.href} className="font-medium underline underline-offset-4 hover:no-underline">
            {a.cta}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, value, sub, href }: { label: string; value: string; sub?: string; href: string }) {
  return (
    <Link href={href} className="group rounded-control p-3 transition-colors hover:bg-sunken">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </Link>
  );
}

/** Bul ve Ulaş: sol çubuktaki iki iş akışı bölümünün özeti. Aralarındaki ok, kişilerin bulunup kampanyaya aktığını gösterir. */
function Lanes({ data }: { data: HomeData }) {
  const { account, pipeline: p } = data;
  return (
    <div className="relative grid gap-5 lg:grid-cols-2">
      <section aria-labelledby="lane-bul" className={`${card} p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 id="lane-bul" className="font-semibold tracking-tight">
            Bul
          </h2>
          <span className="text-xs text-muted">Potansiyel müşteriler</span>
        </div>
        <div className="-mx-3 grid grid-cols-3 gap-1">
          <Stat label="Kayıtlı kişi" value={num(p.contacts)} href="/panel/kisiler" />
          <Stat label="Takipteki firma" value={num(data.customer.tracked)} href="/panel/firmalar" />
          <Stat label="Kalan kredi" value={num(account.credits)} sub={account.plan.label} href="/panel/kisi-bul" />
        </div>
        <p className="mt-2 text-xs text-muted">
          Bugünkü ücretsiz listeleme: {num(Math.max(account.browse.limit - account.browse.used, 0))} / {num(account.browse.limit)} kişi
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href="/panel/kisi-bul" className="h-9">
            Kişi bul
          </ButtonLink>
          <ButtonLink href="/panel/musteri-bul" className="h-9" variant="secondary">
            Firma bul
          </ButtonLink>
        </div>
      </section>

      <span aria-hidden="true" className="absolute top-1/2 left-1/2 z-10 hidden size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-paper text-muted ring-1 ring-line lg:grid">
        <Arrow />
      </span>

      <section aria-labelledby="lane-ulas" className={`${card} p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 id="lane-ulas" className="font-semibold tracking-tight">
            Ulaş
          </h2>
          <span className="text-xs text-muted">Kampanyalar ve yanıtlar</span>
        </div>
        <div className="-mx-3 grid grid-cols-3 gap-1">
          <Stat label="Aktif kampanya" value={num(data.activeCampaigns)} sub={`${num(p.inCampaign)} kişi sırada`} href="/panel/kampanyalar" />
          <Stat label="Okunmamış yanıt" value={num(data.facts.unread)} href="/panel/gelen-kutusu" />
          <Stat label="Toplantı (30 gün)" value={num(p.meetings)} href="/panel/raporlar" />
        </div>
        <p className="mt-2 text-xs text-muted">
          Son 30 günde {num(data.reports.overview.totals.sent)} e-posta gönderildi, {num(p.replies)} yanıt alındı.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href="/panel/kampanyalar" className="h-9">
            Yeni kampanya
          </ButtonLink>
          <ButtonLink href="/panel/gelen-kutusu" className="h-9" variant="secondary">
            Gelen kutusu
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}

function Performance({ data }: { data: HomeData }) {
  const o = data.reports.overview;
  const max = Math.max(...o.daily.map((d) => d.sent), 1);
  const rows = [
    { label: "Gönderilen", value: num(o.totals.sent) },
    { label: "Yanıt oranı", value: rate(o.rates.reply) },
    { label: "Olumlu yanıt", value: num(o.totals.positive) },
    { label: "Geri dönen", value: rate(o.rates.bounce), bad: o.totals.sent >= 20 && o.rates.bounce >= 5.5 },
  ];
  return (
    <Section
      title="Son 30 gün"
      action={
        <Link href="/panel/raporlar" className={link}>
          Tüm raporlar
        </Link>
      }
    >
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-sm text-muted">{r.label}</dt>
            <dd className={`text-2xl font-semibold tracking-tight tabular-nums ${r.bad ? "text-danger" : ""}`}>{r.value}</dd>
          </div>
        ))}
      </dl>
      {o.totals.sent > 0 ? (
        <div role="img" aria-label="Son 30 günün günlük gönderimi ve yanıtları" className="mt-5 flex h-28 items-end gap-[3px]">
          {o.daily.map((d) => (
            <div key={d.date} title={`${d.date}: ${d.sent} gönderilen · ${d.replied} yanıt`} className="flex h-full min-w-0 flex-1 items-end">
              <div className="w-full rounded-t-[3px] bg-forest/60" style={{ height: `${(d.sent / max) * 100}%`, minHeight: d.sent ? 2 : 0 }}>
                {d.replied > 0 && <div className="w-full rounded-t-[3px] bg-accent" style={{ height: `${Math.min((d.replied / Math.max(d.sent, 1)) * 100, 100)}%`, minHeight: 2 }} />}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-control bg-sunken/60 px-4 py-6 text-center text-sm text-muted">İlk kampanyanızı başlattığınızda günlük gönderim ve yanıtlar burada görünür.</p>
      )}
    </Section>
  );
}

function Replies({ data }: { data: HomeData }) {
  return (
    <Section
      title="Son yanıtlar"
      action={
        <Link href="/panel/gelen-kutusu" className={link}>
          Gelen kutusu
        </Link>
      }
    >
      {data.recentReplies.length === 0 ? (
        <p className="text-sm text-muted">Henüz yanıt yok. Kampanyalarınıza gelen yanıtlar burada görünür ve otomatik etiketlenir.</p>
      ) : (
        <ul className="-mx-2 grid">
          {data.recentReplies.map((r) => (
            <li key={r.id}>
              <Link href="/panel/gelen-kutusu" className="flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors hover:bg-sunken">
                <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${r.unread ? "bg-forest" : "bg-transparent"}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${r.unread ? "font-semibold" : "font-medium"}`}>
                    {r.name}
                    {r.company && <span className="font-normal text-muted"> · {r.company}</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">{r.subject || "—"}</span>
                </span>
                <span className="shrink-0 rounded-full bg-sunken px-2.5 py-0.5 text-xs text-muted">{r.status}</span>
                <time dateTime={r.at} className="w-16 shrink-0 text-right text-xs text-muted">
                  {ago(r.at)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Senders({ data }: { data: HomeData }) {
  return (
    <Section
      title="Gönderici adresleri"
      action={
        <Link href="/panel/posta-kutulari" className={link}>
          Yönet
        </Link>
      }
    >
      {data.mailboxes.length === 0 ? (
        <div className="grid gap-3">
          <p className="text-sm text-muted">E-postalar kendi adresinizden gider. Google hesabınızla tek tıkla bağlayın.</p>
          <ButtonLink href="/panel/posta-kutulari" className="h-9 justify-self-start">
            Adres bağla
          </ButtonLink>
        </div>
      ) : (
        <ul className="grid gap-4">
          {data.mailboxes.map((m) => {
            const ok = m.status === "bagli";
            return (
              <li key={m.id} className="grid gap-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${ok ? "bg-forest" : m.status === "hata" ? "bg-danger" : "bg-muted"}`} />
                  <span className="min-w-0 flex-1 truncate font-medium">{m.email}</span>
                  <span className="shrink-0 text-xs text-muted">{ok ? "Bağlı" : m.status === "hata" ? "Hata" : "Duraklatıldı"}</span>
                </div>
                <div className="flex items-center gap-3 pl-4">
                  <div role="progressbar" aria-label="Günlük gönderim" aria-valuemin={0} aria-valuemax={m.dailyLimit} aria-valuenow={m.sentToday} className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
                    <div className="h-full rounded-full bg-forest/70" style={{ width: `${Math.min((m.sentToday / m.dailyLimit) * 100, 100)}%` }} />
                  </div>
                  <span className="text-xs text-muted tabular-nums">
                    {m.sentToday} / {m.dailyLimit} bugün
                  </span>
                </div>
                <p className="pl-4 text-xs text-muted">{m.warmup.on ? `Isınıyor · ${m.warmup.day}. gün${m.warmup.score !== null ? ` · skor %${m.warmup.score}` : ""}` : "Isındırma kapalı"}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function Calendar({ c }: { c: HomeData["customer"] }) {
  return (
    <Section
      title="Yaklaşan"
      action={
        <Link href="/panel/plan" className={link}>
          Takvim
        </Link>
      }
    >
      {c.upcoming.length > 0 ? (
        <ul className="grid gap-2.5">
          {c.upcoming.map((p) => (
            <li key={p.id} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                {p.title}
                {p.withName && <span className="text-muted"> · {p.withName}</span>}
              </span>
              <time dateTime={p.startsAt} className="shrink-0 text-xs text-muted">
                {when(p.startsAt)}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Yaklaşan randevu, toplantı ya da görev yok.</p>
      )}
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
  const today = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(new Date());
  return (
    <>
      <SectionTabs title="Ana sayfa" />
      <div className="mb-6">
        <p className="text-sm text-muted">{today}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{firstName ? `Merhaba ${firstName}` : "Merhaba"}</h2>
        <p className="mt-1 text-muted">{profile.businessName} için bugünün özeti</p>
      </div>

      <div className="grid gap-5">
        <AiPrompt />
        {data ? (
          <>
            <Attention data={data} />
            <Setup data={data} />
            <Lanes data={data} />
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              <div className="grid gap-5">
                <Performance data={data} />
                <Replies data={data} />
              </div>
              <div className="grid gap-5">
                <Senders data={data} />
                <Calendar c={data.customer} />
              </div>
            </div>
          </>
        ) : (
          <p role="status" className={`${card} p-6 text-sm text-muted`}>
            Ana sayfa özeti için veritabanı güncellemesi gerekiyor. Kısa süre sonra tekrar deneyin.
          </p>
        )}
      </div>
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
