import { Button } from "@/components/ui/button";
import { channels, companySizes, labelOf, sectors, services, signals, workTypes } from "@/modules/profile/options";
import type { Draft } from "@/modules/profile/draft";

export type EditableStage = "about" | "target" | "reach" | "fit";

function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted">Belirtilmedi</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((label) => (
        <li key={label} className="rounded-full bg-sunken px-3 py-1 text-sm">
          {label}
        </li>
      ))}
    </ul>
  );
}

function Section({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-line py-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm text-muted">{title}</h2>
        <Button variant="quiet" className="-my-2 -mr-3" onClick={onEdit} aria-label={`${title} bölümünü düzenle`}>
          Düzenle
        </Button>
      </div>
      {children}
    </section>
  );
}

/** Son adımın bilgi kartı: her bölüm ilgili adıma dönülerek düzenlenebilir. */
export function SummaryCard({ draft, onEdit }: { draft: Draft; onEdit: (stage: EditableStage) => void }) {
  const signalItems = [...draft.signals.map((s) => labelOf(signals, s))];
  const place = draft.cityScope === "turkey" ? ["Türkiye genelinde"] : draft.targetCities;

  return (
    <div className="rounded-panel bg-surface p-6 shadow-float ring-1 ring-line sm:p-9">
      <header className="flex items-start justify-between gap-4 pb-6">
        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-tight">{draft.businessName}</p>
          <p className="mt-1 text-muted">{labelOf(workTypes, draft.workType)}</p>
          {draft.businessDescription && <p className="mt-3 max-w-prose text-pretty">{draft.businessDescription}</p>}
        </div>
        <Button variant="quiet" className="-mr-3 shrink-0" onClick={() => onEdit("about")} aria-label="İşletme bilgilerini düzenle">
          Düzenle
        </Button>
      </header>

      <Section title="Sattığınız hizmetler" onEdit={() => onEdit("target")}>
        <Chips items={draft.services.map((s) => labelOf(services, s))} />
      </Section>
      <Section title="Hedef müşteri" onEdit={() => onEdit("target")}>
        <Chips items={[...draft.targetSectors.map((s) => labelOf(sectors, s)), ...draft.targetSizes.map((s) => labelOf(companySizes, s))]} />
      </Section>
      <Section title="Bölge" onEdit={() => onEdit("reach")}>
        <Chips items={place} />
      </Section>
      <Section title="İletişim kanalları" onEdit={() => onEdit("reach")}>
        <Chips items={draft.channels.map((c) => labelOf(channels, c))} />
      </Section>
      <Section title="İyi aday işaretleri" onEdit={() => onEdit("fit")}>
        <Chips items={signalItems} />
        {draft.signalNotes && <p className="text-pretty text-muted">&ldquo;{draft.signalNotes}&rdquo;</p>}
      </Section>

    </div>
  );
}
