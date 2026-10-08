import type { ReactNode } from "react";
import { BoltIcon, ChartIcon, HomeIcon, InboxIcon, SearchIcon, SendIcon, SparkleIcon, UsersIcon } from "@/components/ui/icons";

/**
 * Tanıtım sayfasındaki ürün görselleri: gerçek arayüzün sadeleştirilmiş, statik kopyaları (görsel dosyası yok; her boyutta keskin,
 * koyu/açık temaya uyumlu). Veriler örnektir.
 */

function Frame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-panel bg-surface shadow-float ring-1 ring-line ${className}`} aria-hidden="true">
      <div className="flex items-center gap-1.5 border-b border-line bg-sunken/60 px-4 py-2.5">
        <i className="size-2.5 rounded-full bg-line-strong" />
        <i className="size-2.5 rounded-full bg-line-strong" />
        <i className="size-2.5 rounded-full bg-line-strong" />
      </div>
      {children}
    </div>
  );
}

/** Ana sayfa (dashboard) görseli. */
export function DashboardMock() {
  const rail = [HomeIcon, SearchIcon, SendIcon, InboxIcon, ChartIcon];
  return (
    <Frame>
      <div className="grid grid-cols-[3rem_minmax(0,1fr)]">
        <div className="grid content-start justify-items-center gap-2 border-r border-line py-4">
          {rail.map((Icon, i) => (
            <span key={i} className={`grid size-8 place-items-center rounded-control ${i === 0 ? "bg-forest-soft text-accent" : "text-muted"}`}>
              <Icon size={16} />
            </span>
          ))}
        </div>
        <div className="grid gap-4 p-5 sm:p-6">
          <div>
            <p className="text-xs text-muted">Perşembe, 8 Ekim</p>
            <p className="text-lg font-semibold tracking-tight">Merhaba Elif</p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-row bg-forest-soft p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">3 yeni yanıtınız var</p>
              <p className="truncate text-xs text-muted">Yanıt veren kişilere dönmek sonucu en çok etkiler.</p>
            </div>
            <span className="shrink-0 rounded-control bg-forest px-3 py-1.5 text-xs font-medium text-white">Yanıtla</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Kişi bul", "184 kayıtlı", UsersIcon],
              ["Otomasyon", "2 aktif", BoltIcon],
            ].map(([t, s, Icon]) => {
              const I = Icon as typeof UsersIcon;
              return (
                <div key={t as string} className="grid gap-2 rounded-row p-3.5 ring-1 ring-line">
                  <span className="flex items-center justify-between text-muted">
                    <span className="grid size-7 place-items-center rounded-control bg-forest-soft text-accent">
                      <I size={14} />
                    </span>
                    <span className="text-[0.7rem]">{s as string}</span>
                  </span>
                  <span className="text-sm font-semibold">{t as string}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Frame>
  );
}

/** Kişi bul görseli: unvanlı sonuç satırları. */
export function LeadsMock() {
  const rows = [
    ["Selin Kaya", "Pazarlama Müdürü", "Moda Dental"],
    ["Mert Aydın", "Kurucu", "Aydın Mimarlık"],
    ["Zeynep Acar", "Genel Müdür", "Acar Lojistik"],
    ["Can Demir", "Satış Direktörü", "Demir Otomotiv"],
  ];
  return (
    <Frame>
      <div className="grid gap-3 p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 flex-1 items-center gap-2 rounded-control bg-sunken px-3 text-xs text-muted">
            <SearchIcon size={14} /> Pazarlama müdürleri · İstanbul
          </span>
          <span className="rounded-control bg-forest px-3 py-2 text-xs font-medium text-white">Ara</span>
        </div>
        <ul className="divide-y divide-line">
          {rows.map(([n, t, c], i) => (
            <li key={n} className="flex items-center gap-3 py-2.5">
              <span className={`grid size-5 place-items-center rounded-[0.3rem] ring-1 ${i < 2 ? "bg-forest text-white ring-forest" : "ring-line-strong"}`}>{i < 2 ? "✓" : ""}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{n}</span>
                <span className="block truncate text-xs text-muted">
                  {t} · {c}
                </span>
              </span>
              <span className="rounded-full bg-sunken px-2 py-0.5 text-[0.7rem] text-muted">e-posta bulundu</span>
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  );
}

/** Firma bul görseli: puanlanmış yerel firmalar. */
export function FirmsMock() {
  const rows = [
    ["Lale Diş Kliniği", "Kadıköy · web sitesi yok", 92],
    ["Feneryolu Dental", "Kadıköy · yorum sayısı yüksek", 84],
    ["Moda Ağız ve Diş", "Kadıköy · site eski", 71],
  ];
  return (
    <Frame>
      <ul className="divide-y divide-line p-2">
        {rows.map(([n, s, p]) => (
          <li key={n as string} className="flex items-center gap-3 px-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{n}</span>
              <span className="block truncate text-xs text-muted">{s}</span>
            </span>
            <span className="grid h-8 min-w-10 place-items-center rounded-control bg-forest-soft px-2 text-sm font-semibold tabular-nums text-accent">{p}</span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

/** Otomasyon görseli: sürüklenebilir adımlar. */
export function AutomationMock() {
  const steps = [
    ["1. adım · Otomatik e-posta", "Hemen · “{{first_name}}, kısa bir fikrim var”"],
    ["2. adım · Otomatik e-posta", "3 gün sonra · Önceki konuya Re:"],
    ["3. adım · Arama", "1 gün sonra · Takvime görev düşer"],
  ];
  return (
    <Frame>
      <div className="grid gap-3 p-5">
        {steps.map(([t, s], i) => (
          <div key={t} className={`flex items-center gap-3 rounded-row bg-surface p-3.5 ring-1 ${i === 1 ? "ring-forest shadow-float" : "ring-line"}`}>
            <svg viewBox="0 0 12 18" width="10" height="16" className="shrink-0 text-muted" fill="currentColor">
              {[3, 9, 15].flatMap((y) => [3, 9].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" />))}
            </svg>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t}</span>
              <span className="block truncate text-xs text-muted">{s}</span>
            </span>
          </div>
        ))}
        <p className="text-center text-xs text-muted">Adımları sürükleyerek sıralayın</p>
      </div>
    </Frame>
  );
}

/** Gelen kutusu görseli. */
export function InboxMock() {
  const rows = [
    ["Selin Kaya", "Merhaba, fiyat bilgisi alabilir miyiz?", "İlgili", "bg-forest-soft text-accent", true],
    ["Mert Aydın", "Perşembe 14:00 uygun olur.", "Toplantı planlandı", "bg-forest-soft text-accent", true],
    ["Zeynep Acar", "Şu an ofis dışındayım, 20 Ekim’de döneceğim.", "Ofis dışı", "bg-pollen text-ink", false],
  ];
  return (
    <Frame>
      <ul className="divide-y divide-line">
        {rows.map(([n, m, s, tone, unread]) => (
          <li key={n as string} className="flex items-start gap-3 px-5 py-3.5">
            <span className={`mt-1.5 size-2 shrink-0 rounded-full ${unread ? "bg-forest" : "bg-transparent"}`} />
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-sm ${unread ? "font-semibold" : "font-medium"}`}>{n as string}</span>
              <span className="block truncate text-xs text-muted">{m as string}</span>
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium ${tone as string}`}>{s as string}</span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

/** Adspine AI sohbet görseli. */
export function ChatMock() {
  return (
    <Frame>
      <div className="grid gap-3 p-5">
        <p className="justify-self-end rounded-row bg-forest px-4 py-2.5 text-sm text-white">Hangi gönderici adresim sorunlu?</p>
        <div className="grid gap-2 rounded-row bg-sunken p-4 text-sm">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
            <SparkleIcon size={14} /> Adspine AI
          </span>
          <p>info@firma.com’da 40 e-postanın 4’ü geri döndü (%10); güvenli sınır %5’in üzerinde. Listeyi temizleyip gönderimi azaltmanızı öneririm.</p>
          <span className="w-fit text-xs text-accent underline underline-offset-4">Gönderici adresleri →</span>
        </div>
      </div>
    </Frame>
  );
}

/** Rapor görseli: kaydırınca büyüyen çubuklar (üst öğe ScrollReveal olmalı). */
export function ReportMock() {
  const bars = [30, 42, 38, 55, 48, 66, 60, 78, 70, 90, 82, 96];
  return (
    <Frame>
      <div className="grid gap-4 p-5">
        <dl className="grid grid-cols-3 gap-3">
          {[
            ["Gönderilen", "1.240"],
            ["Yanıt", "%7,8"],
            ["Geri dönen", "%1,2"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="text-xl font-semibold tracking-tight tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex h-28 items-end gap-1.5">
          {bars.map((h, i) => (
            <div key={i} className="flex h-full flex-1 items-end">
              <div
                style={{ height: `${h}%`, transitionDelay: `${i * 45}ms` }}
                className="w-full origin-bottom scale-y-0 rounded-t-[3px] bg-forest/70 transition-transform duration-700 ease-out group-data-[in=true]/reveal:scale-y-100 motion-reduce:scale-y-100"
              />
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}
