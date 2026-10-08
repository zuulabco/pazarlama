"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { GaugeIcon } from "@/components/ui/icons";
import popover from "@/components/ui/popover.module.css";
import type { AccountSummary } from "@/modules/outreach/usage";

const num = (n: number) => new Intl.NumberFormat("tr-TR").format(n);

function Meter({ label, value, max, text, hint, warn }: { label: string; value: number; max: number; text: string; hint?: string; warn?: boolean }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted tabular-nums">{text}</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-1.5 overflow-hidden rounded-full bg-sunken">
        <div className={`h-full rounded-full transition-[width] duration-500 ${warn ? "bg-danger" : "bg-forest"}`} style={{ width: `${pct}%` }} />
      </div>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

/**
 * Plan ve kullanım: sol çubuğun altındaki göstergeden açılır. Paket adı, kalan kredi, gönderici adresi ve kampanya hakları,
 * günlük gönderim ve ücretsiz listeleme hakkı. Simgenin çevresindeki halka kalan krediyi gösterir.
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
        className={`${popover.popover} fixed inset-x-3 bottom-16 z-50 origin-bottom rounded-panel bg-surface p-4 shadow-float ring-1 ring-line md:absolute md:inset-x-auto md:bottom-0 md:left-full md:ml-3 md:w-80 md:origin-bottom-left`}
      >
        {!data ? (
          <p className="py-6 text-center text-sm text-muted">{failed ? "Kullanım bilgisi şu an alınamadı." : "Yükleniyor…"}</p>
        ) : (
          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted">Paketiniz</p>
                <p className="text-lg font-semibold tracking-tight">{data.plan.label}</p>
              </div>
              <span className="rounded-full bg-sunken px-2.5 py-1 text-xs text-muted">Yükseltme yakında</span>
            </div>
            <Meter label="Kalan kredi" value={data.credits} max={data.plan.monthlyCredits} text={`${num(data.credits)} / ${num(data.plan.monthlyCredits)}`} hint="1 kredi = e-postası bulunan 1 kişi. Her ay başında yenilenir." warn={data.credits / Math.max(data.plan.monthlyCredits, 1) < 0.15} />
            <Meter label="Bugünkü gönderim" value={sending.today} max={sending.capacity} text={sending.capacity ? `${num(sending.today)} / ${num(sending.capacity)}` : "Adres yok"} hint="Son 24 saat; bağlı gönderici adreslerinizin toplam günlük limiti." />
            <Meter label="Gönderici adresi" value={data.senders.used} max={data.senders.limit} text={`${data.senders.used} / ${data.senders.limit}`} />
            <Meter label="Kampanya" value={data.campaigns.used} max={data.campaigns.limit} text={`${data.campaigns.used} / ${data.campaigns.limit}`} />
            <Meter label="Ücretsiz listeleme (bugün)" value={data.browse.used} max={data.browse.limit} text={`${num(data.browse.used)} / ${num(data.browse.limit)}`} hint="Kişi bul'da listelemek kredi harcamaz; yalnızca eklerken kredi düşer." />
            <p className="text-xs text-muted">
              Yaklaşık aylık gönderim kapasiteniz {num(data.monthlyCapacity)} e-posta.{" "}
              <Link href="/panel/posta-kutulari" onClick={() => setOpen(false)} className="text-accent underline underline-offset-4 hover:no-underline">
                Gönderici adresleri
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
