import type { CSSProperties, ReactNode } from "react";
import styles from "./showcase.module.css";

const idx = (i: number) => ({ "--i": i }) as CSSProperties;

/** Önizleme kartı: sahnede yüzen beyaz yüzey. */
function Card({ children, i = 0, className = "" }: { children: ReactNode; i?: number; className?: string }) {
  return (
    <div style={idx(i)} className={`${styles.item} rounded-row bg-surface p-4 text-ink shadow-float ${className}`}>
      {children}
    </div>
  );
}

function Leads() {
  const rows = [
    { name: "Işık Diş Kliniği", tag: "Web sitesi yok", score: 91 },
    { name: "Mavi Ağız ve Diş Sağlığı", tag: "Telefon var", score: 84 },
    { name: "Kadıköy Dental", tag: "", score: 72 },
    { name: "Gülüş Polikliniği", tag: "", score: 58 },
  ];
  return (
    <div className="grid gap-3">
      <Card>
        <ul className="grid gap-3.5">
          {rows.map((r, i) => (
            <li key={r.name} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5">
              <p className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{r.name}</span>
                {r.tag && <span className="shrink-0 rounded-full bg-pollen px-2 py-0.5 text-xs font-medium">{r.tag}</span>}
              </p>
              <p className="text-xl font-semibold tabular-nums">{r.score}</p>
              <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
                <div style={{ ...idx(i), width: `${r.score}%` }} className={`${styles.bar} h-full rounded-full bg-score-high`} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card i={4} className="flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-forest text-white" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12 2.5c.5 4.6 2.4 7 7 7.5-4.6.5-6.5 2.9-7 7.5-.5-4.6-2.4-7-7-7.5 4.6-.5 6.5-2.9 7-7.5Z" />
          </svg>
        </span>
        <p className="text-sm">
          <span className="font-medium">Önce hangisini aramalıyım?</span>{" "}
          <span className="text-muted">Işık Diş Kliniği: yüksek yorum, web sitesi yok.</span>
        </p>
      </Card>
    </div>
  );
}

function Work() {
  return (
    <div className="grid gap-3">
      <Card className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <p className="font-medium">Işık Diş Kliniği</p>
        <p className="flex flex-wrap gap-1.5 text-xs">
          <span className="rounded-full bg-pollen px-2 py-0.5 font-medium">Web sitesi yok</span>
          <span className="rounded-full bg-sunken px-2 py-0.5 text-muted">516 yorum</span>
        </p>
      </Card>
      <Card i={1}>
        <p className="text-xs font-medium text-muted">WhatsApp taslağı · samimi ton</p>
        <p className="mt-1.5 leading-relaxed">
          Merhaba, Google&apos;da kliniğinizi inceledim; 516 yorumla çok güçlü bir güveniniz var ama web sitesi bağlantısı göremedim. Kısa bir görüşmeyle fikrimi paylaşabilir miyim?
        </p>
      </Card>
      <Card i={2} className="flex items-center justify-between gap-3 bg-forest-soft!">
        <p className="text-sm text-muted">Düzenle, kopyala ya da WhatsApp&apos;ta aç</p>
        <span className="rounded-full bg-forest px-3 py-1 text-xs font-medium text-white">Gönderdim</span>
      </Card>
    </div>
  );
}

function Ads() {
  const heights = [38, 52, 44, 66, 81, 58, 92];
  return (
    <div className="grid gap-3">
      <Card>
        <p className="text-sm font-medium">Satın alma maliyeti</p>
        <div className="mt-4 flex h-28 items-end gap-2.5" aria-hidden="true">
          {heights.map((h, i) => (
            <div key={i} style={{ ...idx(i), height: `${h}%` }} className={`${styles.column} flex-1 rounded-t-[0.4rem] ${i === 6 ? "bg-danger" : "bg-score-mid"}`} />
          ))}
        </div>
      </Card>
      <Card i={3}>
        <p className="text-sm">
          <span className="font-medium">Neden yükseldi?</span>{" "}
          <span className="text-muted">Hedef kitle çok dar; bütçe üç günde tükeniyor ve gösterim maliyeti artıyor.</span>
        </p>
      </Card>
    </div>
  );
}

function Variants() {
  const v = [
    { k: "A", text: "Web siteniz müşteri kaçırıyor olabilir.", gain: "" },
    { k: "B", text: "Haftada 10 yeni randevu için tek sayfa yeter.", gain: "+18% tıklama" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {v.map((x, i) => (
        <Card key={x.k} i={i} className="grid content-between gap-6">
          <div className="flex items-center justify-between">
            <span className="grid size-7 place-items-center rounded-full bg-sunken text-sm font-semibold">{x.k}</span>
            {x.gain && <span className="rounded-full bg-pollen px-2.5 py-0.5 text-xs font-semibold">{x.gain}</span>}
          </div>
          <p className="font-medium">{x.text}</p>
        </Card>
      ))}
    </div>
  );
}

function Competitors() {
  const rows = [
    { name: "Siz", value: 46, tone: "bg-forest" },
    { name: "Rakip 1", value: 82, tone: "bg-score-mid" },
    { name: "Rakip 2", value: 64, tone: "bg-score-mid" },
  ];
  return (
    <div className="grid gap-3">
      <Card>
        <p className="text-sm font-medium">Aktif reklam sayısı</p>
        <ul className="mt-4 grid gap-3.5">
          {rows.map((r, i) => (
            <li key={r.name} className="grid grid-cols-[4.5rem_1fr_2rem] items-center gap-3 text-sm">
              <span className="text-muted">{r.name}</span>
              <div className="h-2 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
                <div style={{ ...idx(i), width: `${r.value}%` }} className={`${styles.bar} h-full rounded-full ${r.tone}`} />
              </div>
              <span className="text-right font-semibold tabular-nums">{r.value}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card i={3}>
        <p className="text-sm">
          <span className="font-medium">Fark ettik:</span>{" "}
          <span className="text-muted">Rakip 1 hafta sonu kampanyasına ağırlık veriyor.</span>
        </p>
      </Card>
    </div>
  );
}

const previews: Record<string, () => ReactNode> = {
  "musteri-bul": () => <Leads />,
  calis: () => <Work />,
  "meta-reklam": () => <Ads />,
  "reklam-icerik": () => <Variants />,
  "rakip-analizi": () => <Competitors />,
};


/** Bir modülün animasyonlu önizlemesi (ana sayfa vitrini ve panel kartlarında ortak). */
export function ModulePreview({ id }: { id: string }) {
  return <>{(previews[id] ?? (() => null))()}</>;
}
