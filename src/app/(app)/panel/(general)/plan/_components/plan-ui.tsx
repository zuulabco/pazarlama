"use client";

import flow from "@/components/ui/ai-flow.module.css";
import { CheckIcon } from "@/components/ui/icons";
import { formatSlot, fromLocalInputs, toDateInput, toTimeInput } from "@/modules/plan/calendar";
import { kindLabel, type PlanInput, type PlanItem, type PlanKind } from "@/modules/plan/types";

export type Favorite = { id: string; name: string; category: string | null; district: string | null };

/** Türe göre renk (yalnızca tasarım token'ları). Takvimde ve listelerde aynı. */
const dot: Record<PlanKind, string> = {
  randevu: "bg-forest",
  toplanti: "bg-score-mid",
  arama: "bg-pollen ring-1 ring-line-strong ring-inset",
  gorev: "bg-ink",
  not: "bg-line-strong",
};

export function KindDot({ kind, className = "" }: { kind: PlanKind; className?: string }) {
  return <span aria-hidden="true" className={`inline-block size-2 shrink-0 rounded-full ${dot[kind]} ${className}`} />;
}

/** Form alanlarının metin hâli. Tarih ve saatler yerel, "2026-10-09" / "14:30". */
export type FormDraft = {
  kind: PlanKind;
  title: string;
  date: string;
  allDay: boolean;
  start: string;
  end: string;
  /** Tek elemanlı: takipteki firmanın kimliği ya da kullanıcının yazdığı ad. */
  person: string[];
  location: string;
  details: string;
};

export const blankDraft = (date: string, kind: PlanKind = "toplanti"): FormDraft => ({
  kind,
  title: "",
  date,
  allDay: kind === "not",
  start: "10:00",
  end: "",
  person: [],
  location: "",
  details: "",
});

export function draftFromItem(item: PlanItem): FormDraft {
  return {
    kind: item.kind,
    title: item.title,
    date: toDateInput(item.startsAt),
    allDay: item.allDay,
    start: item.allDay ? "10:00" : toTimeInput(item.startsAt),
    end: !item.allDay && item.endsAt ? toTimeInput(item.endsAt) : "",
    person: item.favoriteId ? [item.favoriteId] : item.withName ? [item.withName] : [],
    location: item.location ?? "",
    details: item.details,
  };
}

/** Formdan alan doğrulamaları (yazarken gösterilir). Hata yoksa boş nesne. */
export function draftErrors(d: FormDraft): { title?: string; date?: string; end?: string } {
  const errors: { title?: string; date?: string; end?: string } = {};
  if (!d.title.trim()) errors.title = "Bir başlık yazın.";
  if (!d.date) errors.date = "Bir tarih seçin.";
  if (!d.allDay && d.start && d.end && d.end <= d.start) errors.end = "Bitiş, başlangıçtan sonra olmalı.";
  return errors;
}

/** Formu API gövdesine çevirir. `person`, takipteki bir firmanın kimliyse firmaya bağlanır. */
export function draftToPayload(d: FormDraft, favorites: readonly Favorite[]): Omit<PlanInput, "done"> {
  const who = d.person[0] ?? null;
  const fav = who ? favorites.find((f) => f.id === who) : undefined;
  const allDay = d.allDay;
  return {
    kind: d.kind,
    title: d.title.trim(),
    details: d.details.trim(),
    startsAt: fromLocalInputs(d.date, allDay ? null : d.start || "00:00"),
    endsAt: !allDay && d.end ? fromLocalInputs(d.date, d.end) : null,
    allDay,
    favoriteId: fav?.id ?? null,
    withName: fav ? fav.name : who,
    location: d.location.trim() || null,
  };
}

/** Bir plan satırı: tamamlama düğmesi, saat, başlık, tür ve kişi. Tıklayınca düzenlemeye gider. */
export function PlanRow({
  item,
  onOpen,
  onToggle,
  showDate,
  glow = false,
}: {
  glow?: boolean;
  item: PlanItem;
  onOpen: () => void;
  onToggle: () => void;
  showDate?: string;
}) {
  return (
    <li className={`flex items-start gap-3 rounded-row px-2 py-2 transition-colors hover:bg-sunken/70 ${glow ? flow.once : ""}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        aria-label={`${item.title}: ${item.done ? "tamamlandı olarak işaretli" : "tamamlandı olarak işaretle"}`}
        onClick={onToggle}
        className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ring-1 ring-line-strong ring-inset transition-colors hover:ring-forest aria-checked:bg-forest aria-checked:text-white aria-checked:ring-forest"
      >
        {item.done && <CheckIcon size={12} />}
      </button>
      <button type="button" onClick={onOpen} className="grid min-w-0 flex-1 gap-0.5 text-left">
        <span className={`truncate font-medium ${item.done ? "text-muted line-through" : ""}`}>{item.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
          {showDate && <span>{showDate}</span>}
          <span className="tabular-nums">{formatSlot(item)}</span>
          <span className="inline-flex items-center gap-1.5">
            <KindDot kind={item.kind} />
            {kindLabel(item.kind)}
          </span>
          {item.withName && <span className="truncate">{item.withName}</span>}
        </span>
      </button>
    </li>
  );
}
