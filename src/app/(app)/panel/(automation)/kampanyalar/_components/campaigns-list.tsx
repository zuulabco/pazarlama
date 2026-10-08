"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, SparkleIcon, TrashIcon } from "@/components/ui/icons";
import { RotatingTips } from "@/components/ui/rotating-tips";
import { Segmented } from "@/components/ui/segmented";
import { ShapeLoader } from "@/components/ui/shape-loader";
import { toast, Toaster } from "@/components/ui/toast";
import { starters } from "@/modules/outreach/starters";
import type { SequenceSummary } from "@/modules/outreach/sequence-schema";
import { api } from "../../kisiler/_components/contact-ui";

const statusStyle = { taslak: "bg-sunken text-muted", aktif: "bg-forest-soft text-forest", duraklatildi: "bg-pollen/60 text-ink", arsiv: "bg-sunken text-muted" } as const;
const statusLabel = { taslak: "Taslak", aktif: "Aktif", duraklatildi: "Duraklatıldı", arsiv: "Arşiv" } as const;

const writingTips = ["Hedef kitlenize göre adımlar kurgulanıyor…", "İlk e-posta ve takipler yazılıyor…", "Bekleme süreleri ayarlanıyor…", "Son okuma yapılıyor…"];

const pct = (n: number, d: number) => (d > 0 ? `%${((n / d) * 100).toFixed(1).replace(".", ",").replace(",0", "")}` : "—");

type Method = "ai" | "sablon" | "bos";

function CreatePanel({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const [method, setMethod] = useState<Method>("ai");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [steps, setSteps] = useState<"2" | "3" | "4" | "5">("3");
  const [tone, setTone] = useState<"samimi" | "profesyonel" | "net">("samimi");
  const [starter, setStarter] = useState(starters[0].id);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameOk = name.trim().length > 0;
  const aiOk = goal.trim().length >= 5 && audience.trim().length >= 3;
  const valid = nameOk && (method !== "ai" || aiOk);

  async function create() {
    setTouched(true);
    if (!valid || busy) return;
    setBusy(true);
    const from = method === "ai" ? { kind: "ai", goal: goal.trim(), audience: audience.trim(), steps: Number(steps), tone } : method === "sablon" ? { kind: "starter", id: starter } : undefined;
    const r = await api<{ sequence: { id: string } }>("/api/outreach/sequences", { method: "POST", body: JSON.stringify({ name: name.trim(), from }) });
    setBusy(false);
    if (!r.ok) return toast(r.error, { kind: "error" });
    toast("Kampanya oluşturuldu");
    onCreated(r.data.sequence.id);
  }

  if (busy && method === "ai") {
    return (
      <div role="status" className="grid justify-items-center gap-7 py-12 text-center">
        <ShapeLoader />
        <RotatingTips tips={writingTips} label={null} />
      </div>
    );
  }

  const inputClass = "h-11 w-full min-w-0 rounded-control bg-surface px-3.5 ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest aria-invalid:ring-danger";
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void create();
      }}
      className="grid gap-4"
    >
      <h3 className="text-lg font-semibold tracking-tight">Kampanya oluştur</h3>

      <Segmented
        label="Yöntem"
        items={[
          { key: "ai", label: "Yapay zekâ ile", pressed: method === "ai", onClick: () => setMethod("ai") },
          { key: "sablon", label: "Şablondan", pressed: method === "sablon", onClick: () => setMethod("sablon") },
          { key: "bos", label: "Sıfırdan", pressed: method === "bos", onClick: () => setMethod("bos") },
        ]}
      />

      <label className="grid gap-1.5 text-sm font-medium">
        Kampanya adı
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Örn. Kadıköy diş klinikleri" aria-invalid={touched && !nameOk ? true : undefined} className={inputClass} autoFocus />
        {touched && !nameOk && (
          <span role="alert" className="text-sm font-normal text-danger">
            Kampanyaya bir ad verin.
          </span>
        )}
      </label>

      {method === "ai" && (
        <>
          <p className="text-sm text-muted">Hedef kitleyi ve amacı yazın; Adspine işletme bilgilerinizle 2-5 adımlı bir e-posta dizisi yazsın. Sonra her adımı düzenleyebilirsiniz.</p>
          <label className="grid gap-1.5 text-sm font-medium">
            Kime yazacaksınız?
            <input value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={300} placeholder="Örn. İstanbul'daki küçük restoran ve kafeler" aria-invalid={touched && audience.trim().length < 3 ? true : undefined} className={inputClass} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Amaç nedir?
            <input value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={300} placeholder="Örn. Muhasebe hizmeti için kısa bir tanışma görüşmesi ayarlamak" aria-invalid={touched && goal.trim().length < 5 ? true : undefined} className={inputClass} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5 text-sm font-medium">
              Adım sayısı
              <Segmented label="Adım sayısı" items={(["2", "3", "4", "5"] as const).map((n) => ({ key: n, label: n, pressed: steps === n, onClick: () => setSteps(n) }))} />
            </div>
            <div className="grid gap-1.5 text-sm font-medium">
              Ton
              <Segmented
                label="Ton"
                items={[
                  { key: "samimi", label: "Samimi", pressed: tone === "samimi", onClick: () => setTone("samimi") },
                  { key: "profesyonel", label: "Resmî", pressed: tone === "profesyonel", onClick: () => setTone("profesyonel") },
                  { key: "net", label: "Net", pressed: tone === "net", onClick: () => setTone("net") },
                ]}
              />
            </div>
          </div>
          {touched && !aiOk && (
            <p role="alert" className="text-sm text-danger">
              Kitleyi ve amacı birkaç kelimeyle yazın.
            </p>
          )}
        </>
      )}

      {method === "sablon" && (
        <ul className="grid gap-2">
          {starters.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={starter === s.id}
                onClick={() => setStarter(s.id)}
                className="grid w-full gap-0.5 rounded-row p-3.5 text-left ring-1 ring-line-strong ring-inset transition-colors hover:bg-sunken/60 aria-pressed:bg-forest-soft/70 aria-pressed:ring-forest"
              >
                <span className="font-medium">
                  {s.name} <span className="font-normal text-muted">· {s.steps.length} adım</span>
                </span>
                <span className="text-sm text-muted">{s.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {method === "bos" && <p className="text-sm text-muted">Boş bir kampanya açılır; adımları kendiniz eklersiniz.</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={busy}>
          {method === "ai" && <SparkleIcon size={16} />}
          {busy ? "Oluşturuluyor…" : method === "ai" ? "Yapay zekâ ile yaz" : "Kampanyayı oluştur"}
        </Button>
        <Button variant="quiet" onClick={onCancel} disabled={busy}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}

/** Kampanyalar: liste, durum, özet sayılar; oluşturma paneli (yapay zekâ / şablon / boş). */
export function CampaignsList({ initial, unavailable }: { initial: SequenceSummary[]; unavailable: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [creating, setCreating] = useState(initial.length === 0 && !unavailable);

  async function toggle(s: SequenceSummary) {
    const next = s.status === "aktif" ? "duraklatildi" : "aktif";
    const r = await api<{ sequence: SequenceSummary; problems?: { message: string }[] }>(`/api/outreach/sequences/${s.id}/status`, { method: "POST", body: JSON.stringify({ status: next }) });
    if (!r.ok) return toast(r.error, { kind: "error" });
    setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: r.data.sequence.status, pausedReason: r.data.sequence.pausedReason } : x)));
    toast(next === "aktif" ? "Kampanya başlatıldı" : "Kampanya duraklatıldı");
  }

  async function duplicate(s: SequenceSummary) {
    const r = await api<{ sequence: { id: string } }>(`/api/outreach/sequences/${s.id}/duplicate`, { method: "POST" });
    if (!r.ok) return toast(r.error, { kind: "error" });
    toast("Kampanya çoğaltıldı");
    router.push(`/panel/kampanyalar/${r.data.sequence.id}`);
  }

  async function remove(s: SequenceSummary) {
    const r = await api<{ ok: true }>(`/api/outreach/sequences/${s.id}`, { method: "DELETE" });
    if (!r.ok) return toast(r.error, { kind: "error" });
    setItems((prev) => prev.filter((x) => x.id !== s.id));
    toast("Kampanya silindi");
  }

  if (unavailable) {
    return (
      <div role="status" className="grid justify-items-center gap-3 rounded-panel bg-surface px-6 py-16 text-center ring-1 ring-line">
        <Toaster />
        <p className="text-lg font-semibold tracking-tight">Kampanyalar henüz etkinleştirilmedi</p>
        <p className="max-w-[30rem] text-muted">Bu bölüm için veritabanı güncellemesi gerekiyor. Kısa süre sonra tekrar deneyin.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <Toaster />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Kampanyalar</h2>
          <p className="max-w-[44rem] text-muted">Çok adımlı e-posta dizileri kurun; Adspine kişilere sizin posta kutunuzdan, belirlediğiniz saatlerde ve limitlerle gönderir.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <PlusIcon size={16} />
          Kampanya oluştur
        </Button>
      </div>

      <div className={`grid items-start gap-6 ${creating ? "lg:grid-cols-[minmax(0,1fr)_26rem]" : ""}`}>
        <section aria-label="Kampanyalar" className="grid gap-3">
          {items.length === 0 ? (
            <div className="grid justify-items-center gap-3 rounded-panel bg-surface px-6 py-16 text-center ring-1 ring-line">
              <p className="text-lg font-semibold tracking-tight">Henüz kampanyanız yok</p>
              <p className="max-w-[30rem] text-muted">Hedef kitlenizi ve amacınızı yazın, yapay zekâ ilk e-posta dizinizi yazsın; ya da hazır bir şablonla başlayın.</p>
            </div>
          ) : (
            items.map((s) => (
              <article key={s.id} className="grid gap-3 rounded-panel bg-surface p-5 ring-1 ring-line">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid min-w-0 gap-1">
                    <Link href={`/panel/kampanyalar/${s.id}`} className="truncate text-lg font-semibold tracking-tight underline-offset-4 hover:underline">
                      {s.name}
                    </Link>
                    {s.description && <p className="text-sm text-muted">{s.description}</p>}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[s.status]}`}>{statusLabel[s.status]}</span>
                </div>

                {s.status === "duraklatildi" && s.pausedReason && (
                  <p role="alert" className="rounded-control bg-pollen/50 px-3 py-2 text-sm">
                    {s.pausedReason}
                  </p>
                )}

                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                  {[
                    ["Adım", String(s.stepCount)],
                    ["Kişi", `${s.enrolled}${s.active ? ` (${s.active} sırada)` : ""}`],
                    ["Gönderilen", String(s.sent)],
                    ["Yanıt", `${s.replied} · ${pct(s.replied, s.sent)}`],
                    ["Geri dönen", `${s.bounced} · ${pct(s.bounced, s.sent)}`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-muted">{k}</dt>
                      <dd className="font-medium tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" onClick={() => router.push(`/panel/kampanyalar/${s.id}`)}>
                    Aç
                  </Button>
                  {s.status !== "taslak" && (
                    <Button variant="quiet" onClick={() => void toggle(s)}>
                      {s.status === "aktif" ? "Duraklat" : "Başlat"}
                    </Button>
                  )}
                  <Button variant="quiet" onClick={() => void duplicate(s)}>
                    Çoğalt
                  </Button>
                  <Button variant="quiet" onClick={() => void remove(s)} className="ml-auto text-danger" aria-label={`${s.name} kampanyasını sil`}>
                    <TrashIcon size={16} />
                    Sil
                  </Button>
                </div>
              </article>
            ))
          )}
        </section>

        {creating && (
          <aside aria-label="Kampanya oluştur" className="rounded-panel bg-surface p-5 ring-1 ring-line lg:sticky lg:top-6">
            <CreatePanel onCancel={() => setCreating(false)} onCreated={(id) => router.push(`/panel/kampanyalar/${id}`)} />
          </aside>
        )}
      </div>
    </div>
  );
}
