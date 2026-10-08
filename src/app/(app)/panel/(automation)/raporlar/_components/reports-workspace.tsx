"use client";

import Link from "next/link";
import { useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import type { Day } from "@/modules/outreach/report-overview";
import type { ReportsData } from "@/modules/outreach/reports";
import { api } from "../../kisiler/_components/contact-ui";

type Tab = "genel" | "kampanya" | "adres";

const num = (n: number) => new Intl.NumberFormat("tr-TR").format(n);
const pct = (n: number, d: number) => (d > 0 ? `%${((n / d) * 100).toFixed(1).replace(".", ",").replace(/,0$/, "")}` : "—");
const rate = (r: number) => `%${r.toFixed(1).replace(".", ",").replace(/,0$/, "")}`;
const short = (iso: string) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(new Date(iso));

function Card({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "danger" }) {
  return (
    <div className="grid gap-1 rounded-panel bg-surface p-4 ring-1 ring-line">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`text-2xl font-semibold tracking-tight tabular-nums ${tone === "danger" ? "text-danger" : ""}`}>{value}</dd>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

/** Günlük gönderim (sütun) ve yanıt (üstte açık sütun) grafiği. Her sütunun ayrıntısı üzerine gelince görünür. */
function DailyChart({ daily }: { daily: Day[] }) {
  const max = Math.max(...daily.map((d) => d.sent), 1);
  const total = daily.reduce((n, d) => n + d.sent, 0);
  return (
    <figure className="grid gap-3">
      <div role="img" aria-label={`Günlük gönderim grafiği: son ${daily.length} günde toplam ${total} e-posta`} className="flex h-44 items-end gap-[3px]">
        {daily.map((d) => (
          <div key={d.date} title={`${short(d.date)}: ${d.sent} gönderilen · ${d.replied} yanıt · ${d.bounced} geri dönen`} className="group relative flex h-full min-w-0 flex-1 items-end">
            <div className="w-full rounded-t-[3px] bg-forest/70 transition-colors group-hover:bg-forest" style={{ height: `${(d.sent / max) * 100}%`, minHeight: d.sent ? 2 : 0 }}>
              {d.replied > 0 && <div className="w-full rounded-t-[3px] bg-accent" style={{ height: `${Math.min((d.replied / Math.max(d.sent, 1)) * 100, 100)}%`, minHeight: 2 }} />}
            </div>
          </div>
        ))}
      </div>
      <figcaption className="flex items-center justify-between text-xs text-muted">
        <span>{short(daily[0].date)}</span>
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-sm bg-forest/70" /> Gönderilen
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-sm bg-accent" /> Yanıt
          </span>
        </span>
        <span>{short(daily[daily.length - 1].date)}</span>
      </figcaption>
    </figure>
  );
}

const th = "px-4 py-3 font-medium";
const td = "px-4 py-3 tabular-nums";

/** Raporlar (Instantly Reports yapısı): tarih aralığı, özet kartlar, günlük grafik, kampanya ve gönderici adresi kırılımı. */
export function ReportsWorkspace({ initial }: { initial: ReportsData }) {
  const [data, setData] = useState(initial);
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [tab, setTab] = useState<Tab>("genel");
  const [busy, setBusy] = useState(false);

  async function load(next: 7 | 30 | 90) {
    setDays(next);
    setBusy(true);
    const r = await api<ReportsData>(`/api/outreach/reports?days=${next}`);
    setBusy(false);
    if (r.ok) setData(r.data);
  }

  const { overview: o } = data;
  const empty = o.totals.sent === 0;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Rapor bölümü"
          items={[
            { key: "genel", label: "Genel bakış", pressed: tab === "genel", onClick: () => setTab("genel") },
            { key: "kampanya", label: "Kampanyalar", pressed: tab === "kampanya", onClick: () => setTab("kampanya") },
            { key: "adres", label: "Gönderici adresleri", pressed: tab === "adres", onClick: () => setTab("adres") },
          ]}
        />
        <Segmented
          label="Tarih aralığı"
          items={([7, 30, 90] as const).map((d) => ({ key: String(d), label: `Son ${d} gün`, pressed: days === d, onClick: () => void load(d) }))}
        />
      </div>

      <div className={`grid gap-5 transition-opacity duration-200 ${busy ? "opacity-60" : ""}`} aria-busy={busy}>
        {tab === "genel" && (
          <>
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <Card label="Gönderilen" value={num(o.totals.sent)} sub="Kampanya e-postaları" />
              <Card label="Yanıt oranı" value={rate(o.rates.reply)} sub={`${num(o.totals.replied)} yanıt`} />
              <Card label="Olumlu yanıt" value={rate(o.rates.positive)} sub={`${num(o.totals.positive)} kişi (ilgili, toplantı, kazanıldı)`} />
              <Card label="Toplantı" value={num(o.totals.meetings)} sub="Planlanan, yapılan ve kazanılan" />
              <Card label="Geri dönen" value={rate(o.rates.bounce)} sub={`${num(o.totals.bounced)} e-posta`} tone={o.rates.bounce >= 5.5 ? "danger" : undefined} />
              <Card label="Abonelikten çıkan" value={num(o.totals.unsubscribed)} sub="Kara listeye alındı" />
            </dl>

            <section aria-label="Günlük gönderim" className="rounded-panel bg-surface p-5 ring-1 ring-line">
              <h2 className="mb-4 font-semibold tracking-tight">Günlük gönderim</h2>
              {empty ? (
                <div className="grid justify-items-center gap-2 py-12 text-center">
                  <p className="font-semibold">Bu aralıkta gönderim yok</p>
                  <p className="max-w-[26rem] text-sm text-muted">Bir kampanya başlattığınızda gönderim, yanıt ve geri dönen e-postalar burada görünür.</p>
                  <Link href="/panel/kampanyalar" className="text-sm text-accent underline underline-offset-4 hover:no-underline">
                    Kampanyalara git
                  </Link>
                </div>
              ) : (
                <DailyChart daily={o.daily} />
              )}
            </section>
            <p className="text-xs text-muted">Açılma ve tıklama izleme varsayılan olarak kapalıdır (spam riskini azaltmak için); bu yüzden raporda açılma oranı yoktur. Yanıt oranı, geri dönenler düşüldükten sonraki e-postalara göre hesaplanır.</p>
          </>
        )}

        {tab === "kampanya" && (
          <div className="overflow-x-auto rounded-panel bg-surface ring-1 ring-line">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  {["Kampanya", "Gönderilen", "Yanıt", "Olumlu", "Toplantı", "Geri dönen"].map((h) => (
                    <th key={h} scope="col" className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((c) => (
                  <tr key={c.id} className="border-t border-line first:border-t-0 hover:bg-sunken/40">
                    <td className="max-w-[20rem] px-4 py-3">
                      <Link href={`/panel/kampanyalar/${c.id}`} className="block truncate font-medium underline-offset-4 hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className={td}>{num(c.sent)}</td>
                    <td className={td}>
                      {num(c.replied)} <span className="text-muted">· {pct(c.replied, c.sent - c.bounced)}</span>
                    </td>
                    <td className={td}>{num(c.positive)}</td>
                    <td className={td}>{num(c.meetings)}</td>
                    <td className={td}>
                      {num(c.bounced)} <span className="text-muted">· {pct(c.bounced, c.sent)}</span>
                    </td>
                  </tr>
                ))}
                {data.campaigns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted">
                      Bu aralıkta gönderim yapan kampanya yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "adres" && (
          <div className="overflow-x-auto rounded-panel bg-surface ring-1 ring-line">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  {["Gönderici adresi", "Gönderilen", "Yanıt", "Geri dönen", "Kurulum puanı", "Isınma skoru"].map((h) => (
                    <th key={h} scope="col" className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.mailboxes.map((m) => (
                  <tr key={m.id} className="border-t border-line first:border-t-0 hover:bg-sunken/40">
                    <td className="max-w-[18rem] truncate px-4 py-3 font-medium">{m.email}</td>
                    <td className={td}>{num(m.sent)}</td>
                    <td className={td}>
                      {num(m.replied)} <span className="text-muted">· {pct(m.replied, m.sent - m.bounced)}</span>
                    </td>
                    <td className={`${td} ${m.sent > 0 && (m.bounced / m.sent) * 100 >= 5.5 ? "text-danger" : ""}`}>
                      {num(m.bounced)} <span className="text-muted">· {pct(m.bounced, m.sent)}</span>
                    </td>
                    <td className={td}>{m.dnsScore === null ? <span className="text-muted">—</span> : `%${m.dnsScore}`}</td>
                    <td className={td}>{m.warmupScore === null ? <span className="text-muted">—</span> : `%${m.warmupScore}`}</td>
                  </tr>
                ))}
                {data.mailboxes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted">
                      Bu aralıkta gönderim yapan gönderici adresi yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
