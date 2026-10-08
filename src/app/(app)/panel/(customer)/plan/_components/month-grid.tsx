"use client";

import { dayKey, formatTime, monthGrid, weekdayShort } from "@/modules/plan/calendar";
import type { PlanItem } from "@/modules/plan/types";
import { KindDot } from "./plan-ui";

/**
 * Aylık takvim ızgarası (6 hafta, Pazartesi'den). Bir güne tıklamak o günü seçer, çift tıklamak o gün için
 * yeni plan açar. Geniş ekranda günün ilk iki planı yazıyla, dar ekranda renkli noktalarla görünür.
 */
export function MonthGrid({
  year,
  month,
  today,
  selected,
  byDay,
  onSelect,
  onAdd,
}: {
  year: number;
  month: number;
  today: string;
  selected: string;
  byDay: Map<string, PlanItem[]>;
  onSelect: (key: string) => void;
  onAdd: (key: string) => void;
}) {
  const days = monthGrid(year, month);
  return (
    <div role="group" aria-label="Aylık takvim" className="grid grid-cols-[repeat(7,minmax(0,1fr))] overflow-hidden rounded-row ring-1 ring-line">
      {weekdayShort.map((d) => (
        <div key={d} className="bg-sunken/60 px-1 py-2 text-center text-xs font-medium text-muted">
          {d}
        </div>
      ))}
      {days.map((d) => {
        const key = dayKey(d);
        const items = byDay.get(key) ?? [];
        const inMonth = d.getMonth() === month;
        const isToday = key === today;
        const isSelected = key === selected;
        const open = items.filter((i) => !i.done).length;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${d.getDate()} ${new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(d)}${isToday ? ", bugün" : ""}, ${items.length === 0 ? "plan yok" : `${items.length} plan`}`}
            onClick={() => onSelect(key)}
            onDoubleClick={() => onAdd(key)}
            data-out={!inMonth}
            className="relative grid min-h-16 content-start gap-1 border-t border-l border-line p-1 text-left transition-colors outline-none first:border-l-0 hover:bg-sunken/60 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-forest aria-pressed:bg-forest-soft/70 data-[out=true]:bg-sunken/30 data-[out=true]:text-muted sm:min-h-[6.5rem] sm:p-1.5 [&:nth-child(7n+8)]:border-l-0"
          >
            <span
              className={`grid size-6 place-items-center rounded-full text-xs font-medium tabular-nums sm:text-sm ${isToday ? "bg-forest text-white" : ""} ${isSelected && !isToday ? "text-accent" : ""}`}
            >
              {d.getDate()}
            </span>
            <span className="hidden min-w-0 gap-0.5 sm:grid">
              {items.slice(0, 2).map((i) => (
                <span
                  key={i.id}
                  title={`${i.allDay ? "Tüm gün" : formatTime(i.startsAt)} · ${i.title}`}
                  className={`flex min-w-0 items-center gap-1.5 rounded-[0.35rem] bg-surface/80 px-1.5 py-0.5 text-xs ${i.done ? "text-muted line-through" : ""}`}
                >
                  <KindDot kind={i.kind} />
                  <span className="truncate">{i.title}</span>
                </span>
              ))}
              {items.length > 2 && <span className="px-1.5 text-xs text-muted">+{items.length - 2} daha</span>}
            </span>
            {items.length > 0 && (
              <span className="flex flex-wrap gap-0.5 sm:hidden" aria-hidden="true">
                {items.slice(0, 4).map((i) => (
                  <KindDot key={i.id} kind={i.kind} className="size-1.5" />
                ))}
              </span>
            )}
            {open > 0 && inMonth && <span className="sr-only">{open} tamamlanmamış</span>}
          </button>
        );
      })}
    </div>
  );
}
