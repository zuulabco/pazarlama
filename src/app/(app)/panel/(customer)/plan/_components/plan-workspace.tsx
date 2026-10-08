"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "@/components/ui/icons";
import { Segmented } from "@/components/ui/segmented";
import { toast, Toaster } from "@/components/ui/toast";
import { addDays, dayKey, formatDayLong, formatMonth, gridRange, itemsByDay, parseDayKey, startOfDay } from "@/modules/plan/calendar";
import type { PlanItem } from "@/modules/plan/types";
import { DayPanel } from "./day-panel";
import { MonthGrid } from "./month-grid";
import { PlanForm } from "./plan-form";
import { PlanRow, blankDraft, draftFromItem, draftToPayload, type Favorite, type FormDraft } from "./plan-ui";

type Panel = { item: PlanItem | null; draft: FormDraft };
type View = "ay" | "ajanda";

const AGENDA_DAYS = 60;

/** Aralığı yeni gelen veriyle değiştirir: aralıktaki eski kayıtlar atılır (başka yerde silinmiş olabilir), diğerleri korunur. */
function merge(prev: PlanItem[], fetched: PlanItem[], from: Date, to: Date): PlanItem[] {
  const ids = new Set(fetched.map((i) => i.id));
  const inRange = (i: PlanItem) => Date.parse(i.endsAt ?? i.startsAt) >= from.getTime() && Date.parse(i.startsAt) < to.getTime();
  return [...prev.filter((i) => !ids.has(i.id) && !inRange(i)), ...fetched];
}

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  try {
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
    const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok || !body) return { ok: false, status: res.status, error: body?.error ?? "İşlem tamamlanamadı. Tekrar deneyin." };
    return { ok: true, data: body };
  } catch {
    return { ok: false, status: 0, error: "Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin." };
  }
}

/** Plan: aylık takvim + ajanda görünümü, seçili günün paneli ve plan formu. */
export function PlanWorkspace({
  favorites,
  initialItems,
  unavailable: initialUnavailable,
  todayKey,
  nowMs,
  openFirmId,
}: {
  favorites: Favorite[];
  initialItems: PlanItem[];
  unavailable: boolean;
  todayKey: string;
  nowMs: number;
  /** Takip sayfasından "Plan yap" ile gelindiyse, o firma için hazır dolu form açılır. */
  openFirmId: string | null;
}) {
  const start = parseDayKey(todayKey);
  const [cursor, setCursor] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const [selected, setSelected] = useState(todayKey);
  const [view, setView] = useState<View>("ay");
  const [items, setItems] = useState(initialItems);
  const [unavailable, setUnavailable] = useState(initialUnavailable);
  const [saving, setSaving] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(() => {
    const firm = openFirmId ? favorites.find((f) => f.id === openFirmId) : undefined;
    return firm ? { item: null, draft: { ...blankDraft(todayKey), title: `${firm.name} ile görüşme`, person: [firm.id] } } : null;
  });
  const panelRef = useRef<HTMLDivElement>(null);

  const byDay = useMemo(() => itemsByDay(items), [items]);

  // Form açılınca (özellikle dar ekranda, formun takvimin altında kaldığı durumda) forma kaydırılır.
  const panelOpen = panel !== null;
  useEffect(() => {
    if (panelOpen && window.matchMedia("(max-width: 1023px)").matches) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [panelOpen]);

  async function load(from: Date, to: Date) {
    const r = await api<{ items: PlanItem[] }>(`/api/plan?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`);
    if (!r.ok) {
      if (r.status === 503) setUnavailable(true);
      else toast(r.error, { kind: "error" });
      return;
    }
    setItems((prev) => merge(prev, r.data.items, from, to));
  }

  function moveTo(y: number, m: number) {
    const d = new Date(y, m, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    const { from, to } = gridRange(d.getFullYear(), d.getMonth());
    void load(from, to);
  }

  function changeView(next: View) {
    setView(next);
    if (next === "ajanda") {
      const from = startOfDay(parseDayKey(todayKey));
      void load(from, addDays(from, AGENDA_DAYS));
    }
  }

  /** Bir güne git: seçer, gerekirse ayı değiştirir. */
  function showDay(key: string) {
    setSelected(key);
    const d = parseDayKey(key);
    if (d.getFullYear() !== cursor.y || d.getMonth() !== cursor.m) moveTo(d.getFullYear(), d.getMonth());
  }

  const openNew = (draft: FormDraft) => {
    setSelected(draft.date || selected);
    setPanel({ item: null, draft });
  };
  const openEdit = (item: PlanItem) => setPanel({ item, draft: draftFromItem(item) });

  async function save() {
    if (!panel || saving) return;
    setSaving(true);
    const payload = draftToPayload(panel.draft, favorites);
    const editing = panel.item;
    const r = editing
      ? await api<{ item: PlanItem }>(`/api/plan/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await api<{ item: PlanItem }>("/api/plan", { method: "POST", body: JSON.stringify({ ...payload, done: false }) });
    setSaving(false);
    if (!r.ok) {
      if (r.status === 503) setUnavailable(true);
      return toast(r.error, { kind: "error" });
    }
    const saved = r.data.item;
    setItems((prev) => [...prev.filter((i) => i.id !== saved.id), saved]);
    setPanel(null);
    showDay(dayKey(new Date(saved.startsAt)));
    toast(editing ? "Plan güncellendi" : "Plana eklendi");
  }

  async function toggle(item: PlanItem) {
    const next = !item.done;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: next } : i)));
    const r = await api<{ item: PlanItem }>(`/api/plan/${item.id}`, { method: "PATCH", body: JSON.stringify({ done: next }) });
    if (!r.ok) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: item.done } : i)));
      toast(r.error, { kind: "error" });
    }
  }

  async function remove(item: PlanItem) {
    setSaving(true);
    const r = await api<{ ok: true }>(`/api/plan/${item.id}`, { method: "DELETE" });
    setSaving(false);
    if (!r.ok) return toast(r.error, { kind: "error" });
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setPanel(null);
    toast("Plan silindi", {
      action: {
        label: "Geri al",
        onClick: async () => {
          const { id, ...rest } = item;
          void id;
          const back = await api<{ item: PlanItem }>("/api/plan", { method: "POST", body: JSON.stringify(rest) });
          if (!back.ok) return toast(back.error, { kind: "error" });
          setItems((prev) => [...prev, back.data.item]);
          toast("Plan geri getirildi");
        },
      },
    });
  }

  if (unavailable) {
    return (
      <div role="status" className="grid justify-items-center gap-3 rounded-panel bg-surface px-6 py-16 text-center ring-1 ring-line">
        <Toaster />
        <span className="grid size-12 place-items-center rounded-full bg-forest-soft text-accent">
          <CalendarIcon size={22} />
        </span>
        <p className="text-lg font-semibold tracking-tight">Plan henüz etkinleştirilmedi</p>
        <p className="max-w-[30rem] text-muted">Takvim için veritabanı güncellemesi gerekiyor. Kısa süre sonra tekrar deneyin.</p>
      </div>
    );
  }

  const monthLabel = formatMonth(new Date(cursor.y, cursor.m, 1));
  const agendaFrom = startOfDay(parseDayKey(todayKey));
  const agenda = [...itemsByDay(items.filter((i) => Date.parse(i.endsAt ?? i.startsAt) >= agendaFrom.getTime())).entries()]
    .filter(([key]) => key >= todayKey && key < dayKey(addDays(agendaFrom, AGENDA_DAYS)))
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <Toaster />

      <section aria-label="Takvim" className="grid gap-4 rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-xl font-semibold tracking-tight">{view === "ay" ? monthLabel : "Önümüzdeki 60 gün"}</h2>
          {view === "ay" && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Önceki ay"
                onClick={() => moveTo(cursor.y, cursor.m - 1)}
                className="grid size-9 place-items-center rounded-full ring-1 ring-line-strong ring-inset transition-colors hover:bg-sunken"
              >
                <ChevronLeftIcon size={16} />
              </button>
              <Button variant="secondary" onClick={() => (moveTo(start.getFullYear(), start.getMonth()), setSelected(todayKey))}>
                Bugün
              </Button>
              <button
                type="button"
                aria-label="Sonraki ay"
                onClick={() => moveTo(cursor.y, cursor.m + 1)}
                className="grid size-9 place-items-center rounded-full ring-1 ring-line-strong ring-inset transition-colors hover:bg-sunken"
              >
                <ChevronRightIcon size={16} />
              </button>
            </div>
          )}
          <Segmented
            label="Görünüm"
            items={[
              { key: "ay", label: "Ay", pressed: view === "ay", onClick: () => changeView("ay") },
              { key: "ajanda", label: "Ajanda", pressed: view === "ajanda", onClick: () => changeView("ajanda") },
            ]}
          />
        </div>

        {view === "ay" ? (
          <MonthGrid year={cursor.y} month={cursor.m} today={todayKey} selected={selected} byDay={byDay} onSelect={setSelected} onAdd={(key) => openNew(blankDraft(key))} />
        ) : agenda.length === 0 ? (
          <div className="grid justify-items-center gap-3 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-forest-soft text-accent">
              <CalendarIcon size={22} />
            </span>
            <p className="font-medium">Önümüzdeki 60 günde planınız yok</p>
            <Button onClick={() => openNew(blankDraft(todayKey))}>
              <PlusIcon size={16} />
              Plan ekle
            </Button>
          </div>
        ) : (
          <div className="grid gap-5">
            {agenda.map(([key, list]) => (
              <section key={key} aria-label={formatDayLong(parseDayKey(key))} className="grid gap-1">
                <h3 className="text-sm font-medium text-muted">
                  {key === todayKey ? "Bugün · " : ""}
                  {formatDayLong(parseDayKey(key))}
                </h3>
                <ul className="grid gap-0.5">
                  {list.map((i) => (
                    <PlanRow key={`${key}-${i.id}`} item={i} onOpen={() => (showDay(key), openEdit(i))} onToggle={() => toggle(i)} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Renkler">
          {[
            ["Randevu", "bg-forest"],
            ["Toplantı", "bg-score-mid"],
            ["Arama", "bg-pollen ring-1 ring-line-strong ring-inset"],
            ["Görev", "bg-ink"],
            ["Not", "bg-line-strong"],
          ].map(([label, cls]) => (
            <li key={label} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={`inline-block size-2 rounded-full ${cls}`} />
              {label}
            </li>
          ))}
          <li className="ml-auto hidden sm:block">Bir güne çift tıklayarak plan ekleyin</li>
        </ul>
      </section>

      <aside ref={panelRef} aria-label={panel ? "Plan formu" : "Gün paneli"} className="scroll-mt-4 rounded-panel bg-surface p-5 ring-1 ring-line lg:sticky lg:top-6">
        {panel ? (
          <PlanForm
            key={panel.item?.id ?? "yeni"}
            draft={panel.draft}
            onChange={(draft) => setPanel({ ...panel, draft })}
            item={panel.item}
            favorites={favorites}
            others={byDay.get(panel.draft.date) ?? []}
            saving={saving}
            onSave={save}
            onCancel={() => setPanel(null)}
            onDelete={panel.item ? () => remove(panel.item!) : undefined}
          />
        ) : (
          <DayPanel selected={selected} items={byDay.get(selected) ?? []} all={items} nowMs={nowMs} onNew={openNew} onOpen={openEdit} onToggle={toggle} onSelectDay={showDay} />
        )}
      </aside>
    </div>
  );
}
