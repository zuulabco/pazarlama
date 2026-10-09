"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { Toaster, toast } from "@/components/ui/toast";
import type { Mailbox } from "@/modules/outreach/mailbox-schema";
import { blankVariant, maxSteps, stepKinds, type Sequence, type Step, type StepKind } from "@/modules/outreach/sequence-schema";
import { api } from "../../../kisiler/_components/contact-ui";
import { PeopleTab, ReportTab, SettingsTab } from "./campaign-tabs";
import { StepCard, type Sender } from "./step-card";

type Tab = "editor" | "kisiler" | "rapor" | "ayarlar";
const tabs: { key: Tab; label: string }[] = [
  { key: "editor", label: "Adımlar" },
  { key: "kisiler", label: "Kişiler" },
  { key: "rapor", label: "Rapor ve etkinlik" },
  { key: "ayarlar", label: "Ayarlar" },
];
const statusLabel = { taslak: "Taslak", aktif: "Aktif", duraklatildi: "Duraklatıldı", arsiv: "Arşiv" } as const;

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `n${Date.now()}${Math.random().toString(16).slice(2)}`);

function newStep(kind: StepKind, position: number, afterEmail: boolean): Step {
  return {
    id: newId(),
    position,
    kind,
    delayMinutes: position === 0 ? 0 : kind === "email" ? 3 * 1440 : 1440,
    enabled: true,
    variants: kind === "email" ? [blankVariant("A", afterEmail ? "takip" : "tanisma")] : [],
    task: { title: "", notes: "" },
  };
}

/** Otomasyon ayrıntı ekranı: adım editörü, kişiler, rapor, ayarlar ve başlat/duraklat. */
export function CampaignWorkspace({ initial, mailboxes, sender }: { initial: Sequence; mailboxes: Mailbox[]; sender: Sender }) {
  const router = useRouter();
  const [seq, setSeq] = useState(initial);
  const [tab, setTab] = useState<Tab>("editor");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<{ code: string; message: string; overridable: boolean }[]>([]);
  const [statusBusy, setStatusBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef(seq.steps);
  useEffect(() => {
    stepsRef.current = seq.steps;
  });

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const edit = (patch: Partial<Sequence>) => {
    setSeq((s) => ({ ...s, ...patch }));
    setDirty(true);
  };
  const setSteps = (steps: Step[]) => edit({ steps: steps.map((s, i) => ({ ...s, position: i })) });

  /**
   * Sürükleyerek sıralama (fare ve dokunma): tutamaçtan tutulan adım, imleç komşu adımın ortasını geçince onunla yer değiştirir;
   * liste kenarına yaklaşınca sayfa kendiliğinden kayar. Bırakınca sıra kaydedilmeyi bekleyen değişiklik olur.
   */
  function startDrag(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    setDragId(id);
    const move = (ev: PointerEvent) => {
      const from = stepsRef.current.findIndex((s) => s.id === id);
      const y = ev.clientY;
      // Hedef sıra: imlecin üstünde ortası kalan (sürüklenen dışındaki) kart sayısı. Uzun/açık kartlarda da kararlıdır.
      const others = [...(listRef.current?.querySelectorAll<HTMLElement>("[data-step-id]") ?? [])].filter((el) => el.dataset.stepId !== id);
      const to = others.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2 < y;
      }).length;
      if (to !== from && from >= 0) {
        const arr = [...stepsRef.current];
        const [item] = arr.splice(from, 1);
        arr.splice(to, 0, item);
        setSteps(arr);
      }
      if (y < 90) window.scrollBy(0, -14);
      else if (y > window.innerHeight - 90) window.scrollBy(0, 14);
    };
    const end = () => {
      setDragId(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  async function save(): Promise<boolean> {
    const s = seq;
    setSaving(true);
    const r = await api<{ sequence: Sequence }>(`/api/outreach/sequences/${s.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: s.name, description: s.description, schedule: s.schedule, settings: s.settings, steps: s.steps }),
    });
    setSaving(false);
    if (!r.ok) {
      toast(r.error, { kind: "error" });
      return false;
    }
    setSeq((cur) => ({ ...cur, updatedAt: r.data.sequence.updatedAt, steps: r.data.sequence.steps }));
    setDirty(false);
    toast("Kaydedildi");
    return true;
  }

  async function setStatus(status: "aktif" | "duraklatildi", ignoreDns = false) {
    if (statusBusy) return;
    if (dirty && !(await save())) return;
    setStatusBusy(true);
    const res = await fetch(`/api/outreach/sequences/${seq.id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, ignoreDns }) }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { sequence?: Sequence; error?: string; problems?: typeof problems } | null;
    setStatusBusy(false);
    if (!res?.ok || !body?.sequence) {
      toast(body?.error ?? "İşlem tamamlanamadı. Tekrar deneyin.", { kind: "error" });
      setProblems(body?.problems ?? []);
      return;
    }
    const r = { data: { sequence: body.sequence } };
    setProblems([]);
    setSeq((s) => ({ ...s, status: r.data.sequence.status, pausedReason: r.data.sequence.pausedReason }));
    toast(status === "aktif" ? "Otomasyon başlatıldı" : "Otomasyon duraklatıldı");
    router.refresh();
  }

  async function sendTest(subject: string, body: string) {
    const r = await api<{ to: string }>(`/api/outreach/sequences/${seq.id}/test`, { method: "POST", body: JSON.stringify({ subject, body }) });
    if (!r.ok) return toast(r.error, { kind: "error" });
    toast(`Test e-postası ${r.data.to} adresine gönderildi`);
  }

  const emailIdx = seq.steps.findIndex((s) => s.kind === "email");
  const firstSubject = seq.steps[emailIdx]?.variants[0]?.subject ?? "";
  const firstBody = seq.steps[emailIdx]?.variants[0]?.body ?? "";
  const active = seq.status === "aktif";

  return (
    <div className="grid gap-5">
      <Toaster />
      <header className="sticky top-0 z-20 -mx-4 flex min-h-12 flex-wrap items-center gap-x-5 gap-y-1 border-b border-line bg-paper/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 md:-ml-6">
        <div className="flex min-w-0 items-center gap-2 py-2">
          <Link href="/panel/otomasyon" aria-label="Otomasyonlara dön" className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink">
            <ArrowLeftIcon size={16} />
          </Link>
          <h1 className="max-w-[16rem] truncate text-sm font-semibold tracking-tight">{seq.name}</h1>
        </div>
        <div role="tablist" aria-label="Otomasyon bölümleri" className="flex h-12 min-w-0 gap-1 overflow-x-auto [scrollbar-width:none]">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className="flex h-full items-center border-b-2 border-transparent px-3 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:text-ink aria-selected:border-forest aria-selected:text-ink"
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 py-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${active ? "bg-forest-soft text-accent" : "bg-sunken text-muted"}`}>{statusLabel[seq.status]}</span>
          {dirty && <span className="hidden text-xs text-muted sm:inline">Kaydedilmemiş değişiklikler var</span>}
          <Button variant="secondary" onClick={() => void save()} disabled={!dirty || saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
          <Button onClick={() => void setStatus(active ? "duraklatildi" : "aktif")} disabled={statusBusy}>
            {statusBusy ? "…" : active ? "Duraklat" : seq.status === "duraklatildi" ? "Sürdür" : "Başlat"}
          </Button>
        </div>
      </header>
      {seq.pausedReason && (
        <p role="alert" className="rounded-row bg-pollen/50 px-4 py-3 text-sm">
          {seq.pausedReason}
        </p>
      )}

      {problems.length > 0 && (
        <div role="alert" className="grid gap-2 rounded-panel bg-pollen/50 p-4 text-sm">
          <p className="font-medium">Başlatmadan önce:</p>
          <ul className="grid gap-1">
            {problems.map((p) => (
              <li key={p.code}>· {p.message}</li>
            ))}
          </ul>
          {problems.every((p) => p.overridable) && (
            <Button variant="secondary" className="w-fit" onClick={() => void setStatus("aktif", true)}>
              Yine de başlat
            </Button>
          )}
        </div>
      )}

      {tab === "editor" && (
        <div ref={listRef} className="grid gap-3">
          {seq.steps.length === 0 && <p className="rounded-panel bg-surface px-6 py-12 text-center text-muted ring-1 ring-line">Henüz adım yok. Aşağıdan ilk adımı ekleyin.</p>}
          {seq.steps.map((s, i) => (
            <div key={s.id} data-step-id={s.id} className={`rounded-panel transition-shadow ${dragId === s.id ? "relative z-10 shadow-float ring-2 ring-forest" : ""}`}>
            <StepCard
              onGripPointerDown={(e) => startDrag(e, s.id)}
              dragging={dragId === s.id}
              step={s}
              index={i}
              total={seq.steps.length}
              firstEmailIndex={emailIdx}
              firstSubject={firstSubject}
              firstBody={firstBody}
              sender={sender}
              onChange={(next) => setSteps(seq.steps.map((x) => (x.id === s.id ? next : x)))}
              onRemove={() => setSteps(seq.steps.filter((x) => x.id !== s.id))}
              onMove={(dir) => {
                const arr = [...seq.steps];
                [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
                setSteps(arr);
              }}
              onTest={sendTest}
            />
            </div>
          ))}
          {seq.steps.length < maxSteps && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-sm font-medium">Adım ekle:</span>
              {stepKinds.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setSteps([...seq.steps, newStep(k.value, seq.steps.length, emailIdx >= 0)])}
                  className="h-9 rounded-full px-4 text-sm ring-1 ring-line-strong ring-inset transition-colors hover:bg-forest-soft hover:text-accent"
                >
                  + {k.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "kisiler" && <PeopleTab sequenceId={seq.id} onChanged={() => router.refresh()} />}
      {tab === "rapor" && <ReportTab sequenceId={seq.id} />}
      {tab === "ayarlar" && <SettingsTab seq={seq} mailboxes={mailboxes} onChange={edit} />}
    </div>
  );
}
