import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { BoltIcon, ChartIcon, InboxIcon, MapPinIcon, PenIcon, UsersIcon } from "@/components/ui/icons";
import { requireUser } from "@/lib/auth/session";
import { OutreachUnavailableError } from "@/modules/outreach/contacts";
import { loadHome, type HomeData } from "@/modules/outreach/home";
import { focusOf } from "@/modules/outreach/home-rules";
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

const link = "text-sm text-accent underline underline-offset-4 hover:no-underline";

/** Tek odak kartı: şimdi yapılması en yararlı şey. Kurulum bitmediyse küçük bir ilerleme çizgisi gösterir. */
function Focus({ data }: { data: HomeData }) {
  const f = focusOf(data.facts);
  const tone = { danger: "bg-danger-soft", warn: "bg-pollen/50", info: "bg-forest-soft", ok: "bg-forest-soft" }[f.tone];
  return (
    <section aria-label="Şimdi yapılacak" className={`grid gap-5 rounded-panel p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-8 ${tone}`}>
      <div className="grid gap-2">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{f.title}</h2>
        <p className="max-w-[40rem] text-muted">{f.text}</p>
        {f.progress && (
          <div className="mt-2 flex items-center gap-3">
            <div role="progressbar" aria-label="Kurulum ilerlemesi" aria-valuemin={0} aria-valuemax={f.progress.total} aria-valuenow={f.progress.done} className="h-1.5 w-40 overflow-hidden rounded-full bg-surface/70">
              <div className="h-full rounded-full bg-forest" style={{ width: `${(f.progress.done / f.progress.total) * 100}%` }} />
            </div>
            <span className="text-sm text-muted tabular-nums">
              Kurulum {f.progress.done} / {f.progress.total}
            </span>
          </div>
        )}
      </div>
      <ButtonLink href={f.href} size="lg">
        {f.cta}
      </ButtonLink>
    </section>
  );
}

type Tile = { href: string; title: string; text: string; stat: string; icon: ReactNode };

function Tiles({ label, hint, tiles, cols }: { label: string; hint: string; tiles: Tile[]; cols: string }) {
  return (
    <section aria-label={label} className="grid gap-4">
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{label}</h2>
        <p className="text-sm text-muted">{hint}</p>
      </div>
      <ul className={`grid gap-4 sm:grid-cols-2 ${cols}`}>
        {tiles.map((t) => (
          <li key={t.href} className="grid">
            <Link href={t.href} className="group grid h-full content-start gap-3 rounded-panel bg-surface p-5 ring-1 ring-line transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-float">
              <div className="flex items-center justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-control bg-forest-soft text-accent">{t.icon}</span>
                <span className="text-sm text-muted tabular-nums">{t.stat}</span>
              </div>
              <div className="grid gap-1">
                <h3 className="font-semibold tracking-tight">{t.title}</h3>
                <p className="text-sm text-muted">{t.text}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Activity({ data }: { data: HomeData }) {
  const o = data.reports.overview;
  const replies = data.recentReplies.slice(0, 4);
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section aria-label="Son yanıtlar" className="grid gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Son yanıtlar</h2>
          <Link href="/panel/gelen-kutusu" className={link}>
            Tümünü gör
          </Link>
        </div>
        {replies.length === 0 ? (
          <p className="rounded-panel bg-surface p-6 text-sm text-muted ring-1 ring-line">Henüz yanıt yok. Otomasyonlarınıza gelen yanıtlar burada görünür ve otomatik etiketlenir.</p>
        ) : (
          <ul className="divide-y divide-line rounded-panel bg-surface px-2 ring-1 ring-line">
            {replies.map((r) => (
              <li key={r.id}>
                <Link href="/panel/gelen-kutusu" className="flex items-center gap-3 rounded-control px-3 py-3.5 transition-colors hover:bg-sunken/60">
                  <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${r.unread ? "bg-forest" : "bg-transparent"}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${r.unread ? "font-semibold" : "font-medium"}`}>
                      {r.name}
                      {r.company && <span className="font-normal text-muted"> · {r.company}</span>}
                    </span>
                    <span className="block truncate text-xs text-muted">{r.subject || "—"}</span>
                  </span>
                  <span className="hidden shrink-0 rounded-full bg-sunken px-2.5 py-0.5 text-xs text-muted sm:inline">{r.status}</span>
                  <time dateTime={r.at} className="w-16 shrink-0 text-right text-xs text-muted">
                    {ago(r.at)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-8">
        <section aria-label="Son 30 gün" className="grid gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Son 30 gün</h2>
            <Link href="/panel/raporlar" className={link}>
              Raporlar
            </Link>
          </div>
          <dl className="grid grid-cols-3 gap-4 rounded-panel bg-surface p-5 ring-1 ring-line">
            <div>
              <dt className="text-sm text-muted">Gönderilen</dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{num(o.totals.sent)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Yanıt</dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{rate(o.rates.reply)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Geri dönen</dt>
              <dd className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${o.totals.sent >= 20 && o.rates.bounce >= 5.5 ? "text-danger" : ""}`}>{rate(o.rates.bounce)}</dd>
            </div>
          </dl>
        </section>

        {data.customer.upcoming.length > 0 && (
          <section aria-label="Yaklaşan" className="grid gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Yaklaşan</h2>
              <Link href="/panel/plan" className={link}>
                Takvim
              </Link>
            </div>
            <ul className="grid gap-2.5 rounded-panel bg-surface p-5 ring-1 ring-line">
              {data.customer.upcoming.map((p) => (
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
          </section>
        )}
      </div>
    </div>
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

  const find: Tile[] = data
    ? [
        { href: "/panel/kisi-bul", title: "Kişi bul", text: "Unvana ve sektöre göre karar vericileri bulun, e-postalarıyla kaydedin.", stat: `${num(data.pipeline.contacts)} kayıtlı`, icon: <UsersIcon size={20} /> },
        { href: "/panel/musteri-bul", title: "Firma bul", text: "Bölgenizdeki yerel firmaları bulun, puanlayın ve kaydedin.", stat: `${num(data.customer.tracked)} kayıtlı`, icon: <MapPinIcon size={20} /> },
      ]
    : [];
  const reach: Tile[] = data
    ? [
        { href: "/panel/otomasyon", title: "Otomasyon", text: "Adspine AI ile adımları yazın; e-postalar kendiliğinden gitsin.", stat: `${num(data.activeCampaigns)} aktif`, icon: <BoltIcon size={20} /> },
        { href: "/panel/gelen-kutusu", title: "Gelen kutusu", text: "Yanıtları tek yerde görün, etiketleyin ve cevap yazın.", stat: data.facts.unread > 0 ? `${num(data.facts.unread)} yeni` : "Güncel", icon: <InboxIcon size={20} /> },
        { href: "/panel/calis", title: "Mesaj hazırla", text: "Bir kişi ya da firma için tek seferlik mesaj ve e-posta yazdırın.", stat: "Adspine AI", icon: <PenIcon size={20} /> },
        { href: "/panel/raporlar", title: "Raporlar", text: "Gönderim, yanıt ve geri dönen e-postaları izleyin.", stat: `${num(data.reports.overview.totals.sent)} e-posta`, icon: <ChartIcon size={20} /> },
      ]
    : [];

  return (
    <>
      <SectionTabs title="Ana sayfa" />
      <div className="grid gap-10 pb-6">
        <div>
          <p className="text-sm text-muted">{today}</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">{firstName ? `Merhaba ${firstName}` : "Merhaba"}</h2>
          <p className="mt-1 text-muted">{profile.businessName}</p>
        </div>

        {data ? (
          <>
            <Focus data={data} />
            <AiPrompt />
            <Tiles label="Bul" hint="Potansiyel müşterileri bulun" tiles={find} cols="xl:grid-cols-2" />
            <Tiles label="Ulaş" hint="Onlara ulaşın ve sonuçları izleyin" tiles={reach} cols="xl:grid-cols-4" />
            <Activity data={data} />
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
