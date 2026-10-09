"use client";

import { useEffect, useState } from "react";
import { CreditIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { planList, type Plan } from "@/modules/outreach/plans";
import type { AccountSummary } from "@/modules/outreach/usage";

const num = (n: number) => new Intl.NumberFormat("tr-TR").format(n);

const blurb: Record<string, string> = {
  ucretsiz: "Denemek ve ilk müşterilerinizi bulmak için.",
  baslangic: "Tek kişilik ekip; düzenli gönderim için.",
  buyume: "Isındırma, gelen kutusu ve Adspine AI ile büyüyen ekipler.",
  ajans: "Birden fazla müşteriye hizmet veren ajanslar için.",
};

const rank = (p: Plan) => planList.findIndex((x) => x.key === p.key);

function Feature({ on, children }: { on: boolean; children: string }) {
  return (
    <li className={`flex items-start gap-2 ${on ? "" : "text-muted line-through decoration-line-strong"}`}>
      <span aria-hidden="true" className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px] ${on ? "bg-forest text-white" : "bg-sunken text-muted"}`}>
        {on ? "✓" : "–"}
      </span>
      <span>{children}</span>
    </li>
  );
}

/**
 * Planlar penceresi (panelin içinde): dört plan yan yana, mevcut plan işaretli. Ödeme altyapısı bağlanana kadar "seç" düğmesi
 * seçimi e-postayla iletir; plan elle etkinleştirilir.
 */
export function PlansDialog({ open, onClose, email }: { open: boolean; onClose: () => void; email: string | null }) {
  const [data, setData] = useState<AccountSummary | null>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    fetch("/api/outreach/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { account?: AccountSummary } | null) => live && j?.account && setData(j.account))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [open]);

  const current = data?.plan ?? null;
  const founder = current?.key === "kurucu";

  function requestLink(p: Plan) {
    const subject = encodeURIComponent(`${p.label} planına geçmek istiyorum`);
    const body = encodeURIComponent(`Merhaba,\n\n${p.label} ($${p.priceUsd}/ay) planına geçmek istiyorum.\nHesap e-postam: ${email ?? ""}\n`);
    return `mailto:info@adspine.app?subject=${subject}&body=${body}`;
  }

  return (
    <Modal open={open} onClose={onClose} title="Planınızı seçin" width="64rem">
      <div className="grid gap-5">
        <p className="-mt-2 text-sm text-muted">
          Plan ölçüsü, bağlayabildiğiniz gönderici adresi sayısıdır. Ücretli planlar 7 gün ücretsiz denenir; istediğiniz zaman yükseltebilir ya da düşürebilirsiniz.
        </p>

        {founder && <p className="rounded-control bg-forest-soft/60 px-4 py-3 text-sm">Kurucu hesabınızda tüm sınırlar kalkmıştır; plan seçmeniz gerekmez.</p>}

        <ul className="grid gap-4 pt-2 sm:grid-cols-2 xl:grid-cols-4">
          {planList.map((p) => {
            const featured = p.key === "buyume";
            const isCurrent = current?.key === p.key;
            const lower = current ? rank(p) < rank(current) : false;
            return (
              <li key={p.key} className={`relative grid content-between gap-5 rounded-row p-5 ring-1 ${featured ? "bg-forest-soft/50 ring-2 ring-forest/50" : "bg-surface ring-line"}`}>
                {featured && <span className="absolute -top-3 left-5 rounded-full bg-forest px-3 py-0.5 text-xs font-semibold text-white">En çok tercih edilen</span>}
                <div className="grid gap-4">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">{p.label}</h3>
                    <p className="mt-1 min-h-10 text-sm text-muted">{blurb[p.key]}</p>
                  </div>
                  <p className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tracking-tight tabular-nums">${p.priceUsd}</span>
                    <span className="text-sm text-muted">/ ay</span>
                  </p>
                  <ul className="grid gap-2 border-t border-line pt-4 text-sm">
                    <Feature on>{`${p.senders} gönderici adresi`}</Feature>
                    <Feature on>{`Ayda ${num(p.monthlyCredits)} Kredi`}</Feature>
                    <Feature on>{`${p.campaigns} otomasyon`}</Feature>
                    <Feature on>{`Günde ${num(p.browsePerDay)} kişiye kadar listeleme`}</Feature>
                    <Feature on={p.warmupAndInbox}>Isındırma ve gelen kutusu</Feature>
                    <Feature on={p.ai}>Adspine AI</Feature>
                  </ul>
                </div>
                {isCurrent ? (
                  <p className="grid h-10 place-items-center rounded-control bg-sunken text-sm font-medium">Mevcut planınız</p>
                ) : (
                  <a
                    href={founder || lower ? undefined : requestLink(p)}
                    aria-disabled={founder || lower}
                    className={`inline-flex h-10 items-center justify-center rounded-control px-4 text-sm font-medium transition-colors aria-disabled:pointer-events-none aria-disabled:opacity-60 ${featured ? "bg-forest text-white hover:bg-forest-hover" : "ring-1 ring-line-strong ring-inset hover:bg-sunken"}`}
                  >
                    {lower ? "Daha düşük plan" : p.priceUsd === 0 ? "Ücretsize geç" : "7 gün ücretsiz dene"}
                  </a>
                )}
              </li>
            );
          })}
        </ul>

        {data && !founder && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-control bg-sunken/60 px-4 py-3 text-sm text-muted">
            <CreditIcon size={16} />
            <span>
              Şu an <strong className="text-ink">{current?.label}</strong> planındasınız: {num(data.credits)} Kredi kaldı, {data.senders.used}/{data.senders.limit} gönderici adresi, {data.campaigns.used}/{data.campaigns.limit} otomasyon kullanılıyor.
            </span>
          </p>
        )}
        <p className="text-xs text-muted">Online ödeme çok yakında. Şimdilik “dene” düğmesi seçiminizi bize e-postayla iletir ve planınızı sizin için etkinleştiririz.</p>
      </div>
    </Modal>
  );
}
