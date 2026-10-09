import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { CheckIcon, FlameIcon, PlusIcon } from "@/components/ui/icons";
import { requireUser } from "@/lib/auth/session";
import { OutreachUnavailableError } from "@/modules/outreach/contacts";
import { loadHome, type HomeData } from "@/modules/outreach/home";
import { focusOf, setupSteps } from "@/modules/outreach/home-rules";
import { getProfile } from "@/modules/profile/repository";
import { AiPrompt } from "../_components/ai-prompt";
import { Spark } from "../_components/home-widgets";
import { SectionTabs } from "../_components/section-tabs";
import { DashboardSkeleton } from "../_components/skeletons";
import styles from "./home.module.css";

export const metadata: Metadata = { title: "Panel" };

const num = (n: number) => new Intl.NumberFormat("tr-TR").format(n);
const rate = (r: number) => `%${r.toFixed(1).replace(".", ",").replace(/,0$/, "")}`;
const tz = "Europe/Istanbul";
const ago = (iso: string) => {
  const m = Math.max(Math.round((Date.now() - Date.parse(iso)) / 60_000), 0);
  if (m < 60) return `${m || 1} dk önce`;
  if (m < 1440) return `${Math.round(m / 60)} sa önce`;
  return `${Math.round(m / 1440)} gün önce`;
};

const card = "rounded-panel bg-surface ring-1 ring-line";
const link = "text-sm text-accent underline underline-offset-4 hover:no-underline";

/**
 * Tek büyük kart: şimdi yapılacak tek şey. Kurulum bitmediyse sağda adımların kısa listesi görünür;
 * sorun varsa (adres hatası, yüksek geri dönen) kart kırmızıya döner ve önce onu çözdürür.
 */
function Hero({ data }: { data: HomeData }) {
  const f = focusOf(data.facts);
  const steps = setupSteps(data.facts);
  const showSteps = f.progress !== null;
  const tone = { danger: styles.heroDanger, warn: styles.heroWarn, info: styles.heroInfo, ok: styles.heroInfo }[f.tone];
  return (
    <section aria-label="Şimdi yapılacak" className={`${styles.hero} ${tone} relative isolate overflow-hidden rounded-panel p-6 text-white sm:p-8`}>
      <span aria-hidden="true" className={styles.glow} />
      <div className={`relative grid gap-8 ${showSteps ? "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center" : ""}`}>
        <div className="grid content-start gap-4">
          <p className="text-sm font-medium text-white/75">{f.tone === "danger" ? "Önce bunu çözelim" : f.progress ? `Kurulum · ${f.progress.done} / ${f.progress.total}` : "Önerilen"}</p>
          <h2 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">{f.tone === "danger" ? f.cta : f.title}</h2>
          <p className="max-w-[34rem] text-white/80">{f.text}</p>
          <div className="pt-1">
            <ButtonLink href={f.href} variant="inverse" size="lg">
              {f.cta}
            </ButtonLink>
          </div>
        </div>
        {showSteps && (
          <ol className="grid gap-1 rounded-panel bg-white/10 p-3 backdrop-blur-sm" aria-label="Kurulum adımları">
            {steps.map((s) => {
              const next = s.title === f.title;
              return (
                <li key={s.key} className={`flex items-center gap-3 rounded-row px-3 py-2 text-sm ${next ? "bg-white/15 font-medium" : ""}`}>
                  <span className={`grid size-5 shrink-0 place-items-center rounded-full ${s.done ? "bg-white text-accent" : "ring-1 ring-white/50"}`}>{s.done && <CheckIcon size={12} />}</span>
                  <span className={s.done ? "text-white/60 line-through decoration-white/40" : ""}>{s.title}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

/** Üç rakam, tek şerit: son 30 günün özeti. */
function Stats({ data }: { data: HomeData }) {
  const o = data.reports.overview;
  const t = o.totals;
  const items = [
    { label: "Gönderilen", value: num(t.sent), sub: "son 30 gün", values: o.daily.map((d) => d.sent), tone: "forest" as const },
    { label: "Yanıt oranı", value: t.sent > 0 ? rate(o.rates.reply) : "—", sub: `${num(t.replied)} yanıt`, values: o.daily.map((d) => d.replied), tone: "forest" as const },
    { label: "Geri dönen", value: t.sent > 0 ? rate(o.rates.bounce) : "—", sub: "hedef %2 altı", values: o.daily.map((d) => d.bounced), tone: "danger" as const },
  ];
  return (
    <section aria-label="Son 30 gün" className={`${card} grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0`}>
      {items.map((i) => (
        <div key={i.label} className="flex items-end justify-between gap-4 p-5">
          <div>
            <p className="text-sm text-muted">{i.label}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{i.value}</p>
            <p className="text-xs text-muted">{i.sub}</p>
          </div>
          <Spark values={i.values} tone={i.tone} />
        </div>
      ))}
    </section>
  );
}

function Replies({ data }: { data: HomeData }) {
  const replies = data.recentReplies.slice(0, 4);
  return (
    <section aria-label="Son yanıtlar" className={`${card} grid content-start gap-3 p-5`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">Son yanıtlar</h2>
        <Link href="/panel/gelen-kutusu" className={link}>
          Tümü
        </Link>
      </div>
      {replies.length === 0 ? (
        <p className="py-3 text-sm text-muted">Henüz yanıt yok. Otomasyonlarınıza gelen yanıtlar burada görünür.</p>
      ) : (
        <ul className="-mx-2 divide-y divide-line">
          {replies.map((r) => (
            <li key={r.id}>
              <Link href="/panel/gelen-kutusu" className="flex items-center gap-3 rounded-control px-2 py-3 transition-colors hover:bg-sunken/60">
                <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${r.unread ? "bg-forest" : "bg-transparent"}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${r.unread ? "font-semibold" : "font-medium"}`}>
                    {r.name}
                    {r.company && <span className="font-normal text-muted"> · {r.company}</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">{r.subject || "—"}</span>
                </span>
                <time dateTime={r.at} className="shrink-0 text-xs text-muted">
                  {ago(r.at)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Senders({ data }: { data: HomeData }) {
  return (
    <section aria-label="Gönderici adresleri" className={`${card} grid content-start gap-3 p-5`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">Gönderici adresleri</h2>
        <Link href="/panel/posta-kutulari" className={link}>
          Yönet
        </Link>
      </div>
      {data.mailboxes.length === 0 ? (
        <div className="grid justify-items-start gap-3 py-1">
          <p className="text-sm text-muted">E-posta göndermek için bir gönderici adresi bağlayın.</p>
          <ButtonLink href="/panel/posta-kutulari" variant="secondary">
            <PlusIcon size={16} />
            Adres bağla
          </ButtonLink>
        </div>
      ) : (
        <ul className="grid gap-4">
          {data.mailboxes.map((m) => {
            const pct = m.dailyLimit > 0 ? Math.min((m.sentToday / m.dailyLimit) * 100, 100) : 0;
            const dot = m.status === "bagli" ? "bg-forest" : m.status === "hata" ? "bg-danger" : "bg-line-strong";
            return (
              <li key={m.id} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${dot}`} />
                    <span className="truncate font-medium">{m.email}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-muted">
                    {m.warmup.on && (
                      <span className="inline-flex items-center gap-1 text-accent" title="Isındırma açık">
                        <FlameIcon size={14} filled />
                        <span className="tabular-nums">{m.warmup.score !== null ? `%${m.warmup.score}` : `${m.warmup.day}. gün`}</span>
                      </span>
                    )}
                    <span className="tabular-nums">
                      {m.sentToday} / {m.dailyLimit}
                    </span>
                  </span>
                </div>
                <div role="progressbar" aria-label={`${m.email} bugünkü gönderim`} aria-valuemin={0} aria-valuemax={m.dailyLimit} aria-valuenow={m.sentToday} className="h-1 overflow-hidden rounded-full bg-sunken">
                  <div className="h-full rounded-full bg-forest" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
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
      <div className="grid w-full gap-6 pb-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{firstName ? `Merhaba ${firstName}` : "Merhaba"}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {profile.businessName} · {today}
          </p>
        </div>

        {data ? (
          <>
            <Hero data={data} />
            <AiPrompt />
            <Stats data={data} />
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <Replies data={data} />
              <Senders data={data} />
            </div>
          </>
        ) : (
          <p role="status" className="rounded-panel bg-surface p-6 text-sm text-muted ring-1 ring-line">
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
