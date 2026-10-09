"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CreditIcon, GaugeIcon } from "@/components/ui/icons";
import { openAccountDialog } from "@/lib/account-dialog";
import popover from "@/components/ui/popover.module.css";
import { isUnlimited } from "@/modules/outreach/plans";
import type { AccountSummary } from "@/modules/outreach/usage";

const num = (n: number) => new Intl.NumberFormat("tr-TR").format(n);

/** Kompakt gösterge: solda ad, sağda değer, altında ince çubuk. */
function Meter({ label, value, max, text, warn }: { label: string; value: number; max: number; text: string; warn?: boolean }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="font-medium tabular-nums">{text}</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-1 overflow-hidden rounded-full bg-sunken">
        <div className={`h-full rounded-full transition-[width] duration-500 ${warn ? "bg-danger" : "bg-forest"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-line pt-4" aria-label={title}>
      <div>
        <h3 className="text-xs font-medium tracking-wide text-muted uppercase">{title}</h3>
        {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

/** Kredilerin yenileneceği gün (İstanbul takvimine göre bir sonraki ayın ilk günü). */
function nextReset(): string {
  const now = new Date();
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" }).format(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 12)));
}

/**
 * Plan ve kullanım: sol çubuğun altındaki göstergeden açılır. Üstte paket ve Kredi, altında listeleme ve gönderim hakları
 * gruplanmış olarak. Simgedeki kırmızı nokta Kredinin azaldığını belirtir.
 */
export function UsageMenu() {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<AccountSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    fetch("/api/outreach/account")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b: { account: AccountSummary }) => live && (setData(b.account), setFailed(false)))
      .catch(() => live && setFailed(true));
    const onPointer = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      live = false;
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const sending = data?.sending ?? { today: 0, capacity: 0 };
  const unlimited = data ? isUnlimited(data.plan) : false;
  const ratio = data ? Math.min(data.credits / Math.max(data.plan.monthlyCredits, 1), 1) : null;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label="Plan ve kullanım"
        onClick={() => setOpen((o) => !o)}
        className="group relative grid size-11 place-items-center rounded-control text-muted transition-colors hover:bg-sunken hover:text-ink aria-expanded:bg-forest-soft aria-expanded:text-accent md:size-10"
      >
        <GaugeIcon size={20} />
        {ratio !== null && ratio < 0.15 && <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger" />}
        <span role="tooltip" className="pointer-events-none absolute left-full ml-2 hidden origin-left scale-95 rounded-control bg-ink px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-paper opacity-0 shadow-float transition-[opacity,transform] group-hover:opacity-100 md:block md:group-hover:scale-100">
          Plan ve kullanım
        </span>
      </button>

      <div
        id={id}
        data-open={open}
        inert={!open}
        role="dialog"
        aria-label="Plan ve kullanım"
        className={`${popover.popover} fixed inset-x-3 bottom-16 z-50 max-h-[calc(100svh-6rem)] origin-bottom overflow-y-auto rounded-panel bg-surface p-4 shadow-float ring-1 ring-line md:absolute md:inset-x-auto md:bottom-0 md:left-full md:ml-3 md:w-[22rem] md:origin-bottom-left`}
      >
        {!data ? (
          <div className="grid gap-3 py-1" aria-busy="true">
            <div className="h-5 w-28 animate-pulse rounded bg-sunken" />
            <div className="h-24 animate-pulse rounded-row bg-sunken" />
            <div className="h-20 animate-pulse rounded-row bg-sunken" />
            {failed && <p className="text-center text-sm text-muted">Kullanım bilgisi şu an alınamadı.</p>}
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted">Paketiniz</p>
                <p className="text-base font-semibold tracking-tight">{data.plan.label}</p>
              </div>
              {!unlimited && (
                <button type="button" onClick={() => { setOpen(false); openAccountDialog("planlar"); }} className="rounded-full bg-forest px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-forest-hover">
                  Planı yükselt
                </button>
              )}
            </div>

            <div className="grid gap-2.5 rounded-row bg-forest-soft/60 p-4 ring-1 ring-line">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium text-accent">
                    <CreditIcon size={18} />
                    <span className="text-ink">Kredi</span>
                  </p>
                  <p className="text-xs text-muted">{nextReset()} tarihinde yenilenir</p>
                </div>
                <p className="text-2xl leading-none font-semibold tabular-nums">
                  {unlimited ? "Sınırsız" : num(data.credits)}
                  {!unlimited && <span className="text-sm font-normal text-muted"> / {num(data.plan.monthlyCredits)}</span>}
                </p>
              </div>
              <div role="progressbar" aria-label="Kredi" aria-valuemin={0} aria-valuemax={data.plan.monthlyCredits} aria-valuenow={data.credits} className="h-1.5 overflow-hidden rounded-full bg-surface">
                <div className={`h-full rounded-full transition-[width] duration-500 ${(ratio ?? 1) < 0.15 ? "bg-danger" : "bg-forest"}`} style={{ width: `${(ratio ?? 0) * 100}%` }} />
              </div>
              <p className="text-xs text-muted">Listede gizli bilgisi açılıp eklenen her kişi/firma 1 Kredi harcar.</p>
            </div>

            <Group title="Listeleme" note="Listelemek Kredi harcamaz; ayrı bir haktır.">
              <Meter label="Bugün" value={data.browse.today} max={data.browse.dailyLimit} text={unlimited ? `${num(data.browse.today)} · sınırsız` : `${num(data.browse.today)} / ${num(data.browse.dailyLimit)}`} />
              <Meter label="Bu ay" value={data.browse.used} max={data.browse.limit} text={unlimited ? `${num(data.browse.used)} · sınırsız` : `${num(data.browse.used)} / ${num(data.browse.limit)}`} />
            </Group>

            <Group title="Gönderim">
              <Meter label="Son 24 saatte gönderilen" value={sending.today} max={sending.capacity} text={sending.capacity ? `${num(sending.today)} / ${num(sending.capacity)}` : "Adres yok"} />
              <Meter label="Gönderici adresi" value={data.senders.used} max={data.senders.limit} text={unlimited ? `${data.senders.used} · sınırsız` : `${data.senders.used} / ${data.senders.limit}`} />
              <Meter label="Otomasyon" value={data.campaigns.used} max={data.campaigns.limit} text={unlimited ? `${data.campaigns.used} · sınırsız` : `${data.campaigns.used} / ${data.campaigns.limit}`} />
              <p className="text-xs text-muted">
                {unlimited ? "Kurucu hesabı: plan sınırı yok." : `Aylık gönderim kapasiteniz yaklaşık ${num(data.monthlyCapacity)} e-posta.`}{" "}
                <Link href="/panel/posta-kutulari" onClick={() => setOpen(false)} className="text-accent underline underline-offset-4 hover:no-underline">
                  Gönderici adresleri
                </Link>
              </p>
            </Group>
          </div>
        )}
      </div>
    </div>
  );
}
