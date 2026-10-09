"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import frame from "@/components/ui/flow-frame.module.css";
import { PlusIcon, SparkleIcon } from "@/components/ui/icons";
import { RotatingTips } from "@/components/ui/rotating-tips";
import { toast } from "@/components/ui/toast";
import { dayKey, formatDayLong, formatDayShort, parseDayKey } from "@/modules/plan/calendar";
import { planKinds, type PlanItem, type PlanKind } from "@/modules/plan/types";
import { PlanRow, blankDraft, type FormDraft } from "./plan-ui";

const parseTips = ["Yazdığınız okunuyor…", "Tarih ve saat çıkarılıyor…", "Firma aranıyor…"];

type Parsed = {
  kind: PlanKind;
  title: string;
  date: string;
  time: string | null;
  endTime: string | null;
  allDay: boolean;
  withName: string | null;
  favoriteId: string | null;
  location: string | null;
  details: string | null;
};

/**
 * Seçili günün paneli: yapay zekâlı hızlı ekleme ("Cuma 14:30 Moda Kafe ile görüşme"), günün planları,
 * boş günde hazır başlangıçlar; altında geciken görevler ve yaklaşan planlar.
 */
export function DayPanel({
  glowId = null,
  selected,
  items,
  all,
  nowMs,
  onNew,
  onOpen,
  onToggle,
  onSelectDay,
}: {
  /** Adspine AI'nın az önce eklediği planın kimliği (satırı vurgulanır). */
  glowId?: string | null;
  selected: string;
  items: PlanItem[];
  all: PlanItem[];
  nowMs: number;
  onNew: (draft: FormDraft) => void;
  onOpen: (item: PlanItem) => void;
  onToggle: (item: PlanItem) => void;
  onSelectDay: (key: string) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function quickAdd() {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/plan/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: value }) });
      const body = (await res.json().catch(() => null)) as (Parsed & { error?: string }) | null;
      if (!res.ok || !body || body.error) throw new Error(body?.error ?? "Plan hazırlanamadı. Tekrar deneyin.");
      onNew({
        kind: body.kind,
        title: body.title,
        date: body.date,
        allDay: body.allDay,
        start: body.time ?? "10:00",
        end: body.endTime ?? "",
        person: body.favoriteId ? [body.favoriteId] : body.withName ? [body.withName] : [],
        location: body.location ?? "",
        details: body.details ?? "",
      });
      setText("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Plan hazırlanamadı. Tekrar deneyin.", { kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  const day = parseDayKey(selected);
  const overdue = all.filter((i) => i.kind === "gorev" && !i.done && Date.parse(i.startsAt) < nowMs && dayKey(new Date(i.startsAt)) !== selected).slice(0, 4);
  const upcoming = all
    .filter((i) => !i.done && Date.parse(i.endsAt ?? i.startsAt) >= nowMs && dayKey(new Date(i.startsAt)) !== selected)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .slice(0, 5);

  return (
    <div className="grid gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{formatDayLong(day)}</h3>
          <p className="text-sm text-muted">{items.length === 0 ? "Bu gün için plan yok" : `${items.length} plan`}</p>
        </div>
        <Button size="md" onClick={() => onNew(blankDraft(selected))}>
          <PlusIcon size={16} />
          Plan ekle
        </Button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void quickAdd();
        }}
        className="grid gap-2"
      >
        <label htmlFor="plan-quick" className="flex items-center gap-1.5 text-sm font-medium">
          <span className="text-accent">
            <SparkleIcon size={16} />
          </span>
          Yazın, planı biz çıkaralım
        </label>
        <div className={frame.frame} data-busy={busy}>
          <div className="flex items-center gap-2 rounded-[calc(var(--radius-row)-2px)] bg-surface py-1 pr-1 pl-3.5">
            <input
              id="plan-quick"
              value={text}
              onChange={(e) => setText(e.target.value)}
              readOnly={busy}
              maxLength={400}
              placeholder="Örn. Cuma 14:30 Moda Kafe ile görüşme"
              className="h-10 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
            />
            <Button type="submit" size="md" disabled={busy || text.trim().length < 3}>
              Oluştur
            </Button>
          </div>
        </div>
        {busy && (
          <div role="status" className="justify-self-center">
            <RotatingTips tips={parseTips} label={null} />
          </div>
        )}
      </form>

      {items.length > 0 ? (
        <ul className="grid gap-0.5">
          {items.map((i) => (
            <PlanRow key={i.id} item={i} glow={i.id === glowId} onOpen={() => onOpen(i)} onToggle={() => onToggle(i)} />
          ))}
        </ul>
      ) : (
        <div className="grid gap-3 rounded-row bg-sunken/60 p-4">
          <p className="text-sm text-muted">Hazır bir başlangıç seçin:</p>
          <div className="flex flex-wrap gap-2">
            {planKinds.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => onNew(blankDraft(selected, k.value))}
                className="h-9 rounded-full bg-surface px-3.5 text-sm ring-1 ring-line-strong ring-inset transition-colors hover:bg-forest-soft hover:text-accent"
              >
                {k.label} ekle
              </button>
            ))}
          </div>
        </div>
      )}

      {overdue.length > 0 && (
        <section aria-label="Geciken görevler" className="grid gap-1.5">
          <h4 className="text-sm font-medium text-danger">Geciken görevler</h4>
          <ul className="grid gap-0.5">
            {overdue.map((i) => (
              <PlanRow key={i.id} item={i} showDate={formatDayShort(new Date(i.startsAt))} onOpen={() => onSelectDay(dayKey(new Date(i.startsAt)))} onToggle={() => onToggle(i)} />
            ))}
          </ul>
        </section>
      )}

      {upcoming.length > 0 && (
        <section aria-label="Yaklaşan planlar" className="grid gap-1.5">
          <h4 className="text-sm font-medium text-muted">Yaklaşan planlar</h4>
          <ul className="grid gap-0.5">
            {upcoming.map((i) => (
              <PlanRow key={i.id} item={i} showDate={formatDayShort(new Date(i.startsAt))} onOpen={() => onSelectDay(dayKey(new Date(i.startsAt)))} onToggle={() => onToggle(i)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
