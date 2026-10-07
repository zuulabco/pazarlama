import { channels, labelOf, sectors, services, signals, workTypes } from "@/modules/profile/options";
import { computeWeights, criteria } from "@/modules/profile/weights";
import styles from "./wizard.module.css";

export type Draft = {
  businessName: string;
  workType: string;
  services: string[];
  primaryService: string;
  targetSectors: string[];
  targetSize: string;
  cityScope: string;
  targetCities: string[];
  signals: string[];
  channels: string[];
  dealValue: string;
};

function Chips({ items, highlight }: { items: string[]; highlight?: string }) {
  if (items.length === 0) return <span className="text-sm text-muted">Henüz seçilmedi</span>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((label) => (
        <li
          key={label}
          className={`${styles.pop} rounded-full px-2.5 py-1 text-xs font-medium ${
            label === highlight ? "bg-pollen text-ink" : "bg-sunken text-ink"
          }`}
        >
          {label}
        </li>
      ))}
    </ul>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted">{title}</p>
      {children}
    </div>
  );
}

/** Sihirbazın sağındaki canlı önizleme: cevaplar hedef profile ve puanlama ağırlıklarına dönüşür. */
export function LiveProfile({ draft }: { draft: Draft }) {
  const weights = computeWeights(draft);
  const all = Object.values(weights);
  const top = Math.max(...all);
  // Ağırlıklar neredeyse eşitken hiçbir kriteri öne çıkarma.
  const emphasize = top - Math.min(...all) >= 3;
  const primaryLabel = draft.primaryService ? labelOf(services, draft.primaryService) : undefined;
  const places =
    draft.cityScope === "turkey" ? ["Türkiye geneli"] : draft.targetCities.slice(0, 5).concat(draft.targetCities.length > 5 ? [`+${draft.targetCities.length - 5}`] : []);

  return (
    <div className="grid w-full max-w-[28rem] gap-8">
      <div className="grid gap-5 rounded-panel bg-surface p-6 shadow-float">
        <div>
          <p className="text-xs text-muted">Hedef profiliniz</p>
          <p className={`mt-1 text-xl font-semibold tracking-tight ${draft.businessName ? "" : "text-muted"}`}>
            {draft.businessName || "İşletme adınız"}
          </p>
          <p className="text-sm text-muted">{draft.workType ? labelOf(workTypes, draft.workType) : "Çalışma biçiminiz"}</p>
        </div>
        <Row title="Sattığınız hizmetler">
          <Chips items={draft.services.map((s) => labelOf(services, s))} highlight={primaryLabel} />
        </Row>
        <Row title="Hedef sektörler">
          <Chips items={draft.targetSectors.map((s) => labelOf(sectors, s))} />
        </Row>
        <Row title="Bölge">
          <Chips items={places} />
        </Row>
        <Row title="İyi aday işaretleri">
          <Chips items={draft.signals.map((s) => labelOf(signals, s))} />
        </Row>
        <Row title="Ulaşma kanalları">
          <Chips items={draft.channels.map((c) => labelOf(channels, c))} />
        </Row>
      </div>

      <div>
        <p className="text-sm font-medium text-white">Puanlama ağırlıkları</p>
        <p className="mt-1 mb-4 text-xs text-white/65">Cevaplarınıza göre değişir. Firmalar bu önceliklerle puanlanır.</p>
        <dl className="grid gap-3">
          {criteria.map((c) => (
            <div key={c.key} className="grid grid-cols-[minmax(0,11rem)_1fr_2rem] items-center gap-3 text-sm text-white">
              <dt className="truncate text-white/80">{c.label}</dt>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
                <div
                  className={`${styles.weight} h-full rounded-full ${emphasize && weights[c.key] === top ? "bg-pollen" : "bg-white/70"}`}
                  style={{ width: `${(weights[c.key] / top) * 100}%` }}
                />
              </div>
              <dd className="text-right tabular-nums">{weights[c.key]}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
