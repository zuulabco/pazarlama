"use client";

import type { ReactNode } from "react";

export type SegmentedItem = { key: string; label: ReactNode; pressed: boolean; onClick: () => void; disabled?: boolean };

/** Birleşik düğme grubu (segmented control): seçili parça beyaz bir kapsül olarak öne çıkar. */
export function Segmented({ label, items }: { label: string; items: SegmentedItem[] }) {
  return (
    <div role="group" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-control bg-sunken p-0.5">
      {items.map((i) => (
        <button
          key={i.key}
          type="button"
          aria-pressed={i.pressed}
          onClick={i.onClick}
          disabled={i.disabled}
          className="h-8 rounded-[0.5rem] px-2 text-sm whitespace-nowrap text-muted transition-[background-color,color,box-shadow] duration-150 hover:text-ink disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-surface aria-pressed:font-medium aria-pressed:text-accent aria-pressed:shadow-sm"
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}
