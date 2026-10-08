"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, CopyIcon, PenIcon, PlusIcon, SearchIcon, SendIcon, SparkleIcon, TrashIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { RowMenu, type RowMenuItem } from "@/components/ui/row-menu";
import { Select } from "@/components/ui/select";
import { fold } from "@/lib/text";
import { RotatingTips } from "@/components/ui/rotating-tips";
import { Segmented } from "@/components/ui/segmented";
import { ShapeLoader } from "@/components/ui/shape-loader";
import { toast, Toaster } from "@/components/ui/toast";
import { starters } from "@/modules/outreach/starters";
import type { SequenceSummary } from "@/modules/outreach/sequence-schema";
import { api } from "../../kisiler/_components/contact-ui";

const statusStyle = { taslak: "bg-sunken text-muted", aktif: "bg-forest-soft text-accent", duraklatildi: "bg-pollen/60 text-ink", arsiv: "bg-sunken text-muted" } as const;
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
    toast("Otomasyon oluşturuldu");
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
      <Segmented
        label="Yöntem"
        items={[
          { key: "ai", label: "Adspine AI ile", pressed: method === "ai", onClick: () => setMethod("ai") },
          { key: "sablon", label: "Şablondan", pressed: method === "sablon", onClick: () => setMethod("sablon") },
          { key: "bos", label: "Sıfırdan", pressed: method === "bos", onClick: () => setMethod("bos") },
        ]}
      />

      <label className="grid gap-1.5 text-sm font-medium">
        Otomasyon adı
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Örn. Kadıköy diş klinikleri" aria-invalid={touched && !nameOk ? true : undefined} className={inputClass} autoFocus />
        {touched && !nameOk && (
          <span role="alert" className="text-sm font-normal text-danger">
            Otomasyona bir ad verin.
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

      {method === "bos" && <p className="text-sm text-muted">Boş bir otomasyon açılır; adımları kendiniz eklersiniz.</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={busy}>
          {method === "ai" && <SparkleIcon size={16} />}
          {busy ? "Oluşturuluyor…" : method === "ai" ? "Adspine AI ile yaz" : "Otomasyonu oluştur"}
        </Button>
        <Button variant="quiet" onClick={onCancel} disabled={busy}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}

/** Kampanyalar: liste, durum, özet sayılar; oluşturma paneli (Adspine AI / şablon / boş). */
export function CampaignsList({ initial, unavailable }: { initial: SequenceSummary[]; unavailable: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("hepsi");
  const [renaming, setRenaming] = useState<{ s: SequenceSummary; name: string } | null>(null);
  const [deleting, setDeleting] = useState<SequenceSummary | null>(null);
  const [renameBusy, setRenameBusy] = useState(false);

  async function toggle(s: SequenceSummary) {
    const next = s.status === "aktif" ? "duraklatildi" : "aktif";
    const r = await api<{ sequence: SequenceSummary; problems?: { message: string }[] }>(`/api/outreach/sequences/${s.id}/status`, { method: "POST", body: JSON.stringify({ status: next }) });
    if (!r.ok) return toast(r.error, { kind: "error" });
    setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: r.data.sequence.status, pausedReason: r.data.sequence.pausedReason } : x)));
    toast(next === "aktif" ? "Otomasyon başlatıldı" : "Otomasyon duraklatıldı");
  }

  async function duplicate(s: SequenceSummary) {
    const r = await api<{ sequence: { id: string } }>(`/api/outreach/sequences/${s.id}/duplicate`, { method: "POST" });
    if (!r.ok) return toast(r.error, { kind: "error" });
    toast("Otomasyon çoğaltıldı");
    router.push(`/panel/otomasyon/${r.data.sequence.id}`);
  }

  async function rename() {
    if (!renaming || renameBusy) return;
    const name = renaming.name.trim();
    if (!name) return;
    setRenameBusy(true);
    const r = await api<{ sequence: SequenceSummary }>(`/api/outreach/sequences/${renaming.s.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
    setRenameBusy(false);
    if (!r.ok) return toast(r.error, { kind: "error" });
    setItems((prev) => prev.map((x) => (x.id === renaming.s.id ? { ...x, name } : x)));
    setRenaming(null);
    toast("Ad güncellendi");
  }

  /** Satırın üç nokta menüsü: düzenle, yeniden adlandır, çoğalt, başlat/duraklat, sil. */
  const menuFor = (s: SequenceSummary): RowMenuItem[] => [
    { label: "Düzenle", icon: <ArrowRightIcon size={16} />, href: `/panel/otomasyon/${s.id}` },
    { label: "Yeniden adlandır", icon: <PenIcon size={16} />, onClick: () => setRenaming({ s, name: s.name }) },
    { label: "Çoğalt", icon: <CopyIcon size={16} />, onClick: () => void duplicate(s) },
    ...(s.status !== "taslak" ? [{ label: s.status === "aktif" ? "Duraklat" : "Başlat", icon: <SendIcon size={16} />, onClick: () => void toggle(s) }] : []),
    { label: "Sil", icon: <TrashIcon size={16} />, danger: true, separatorBefore: true, onClick: () => setDeleting(s) },
  ];

  async function remove(s: SequenceSummary) {
    const r = await api<{ ok: true }>(`/api/outreach/sequences/${s.id}`, { method: "DELETE" });
    if (!r.ok) return toast(r.error, { kind: "error" });
    setItems((prev) => prev.filter((x) => x.id !== s.id));
    toast("Otomasyon silindi");
  }

  if (unavailable) {
    return (
      <div role="status" className="grid justify-items-center gap-3 rounded-panel bg-surface px-6 py-16 text-center ring-1 ring-line">
        <Toaster />
        <p className="text-lg font-semibold tracking-tight">Otomasyonlar henüz etkinleştirilmedi</p>
        <p className="max-w-[30rem] text-muted">Bu bölüm için veritabanı güncellemesi gerekiyor. Kısa süre sonra tekrar deneyin.</p>
      </div>
    );
  }

  const shown = items.filter((s) => (filter === "hepsi" || s.status === filter) && (!query.trim() || fold(s.name).includes(fold(query.trim()))));

  return (
    <div className="grid gap-4">
      <Toaster />
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[14rem] flex-1 sm:max-w-xs">
          <span className="sr-only">Otomasyon ara</span>
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
            <SearchIcon size={15} />
          </span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ara" className="h-10 w-full rounded-control bg-surface pr-3 pl-9 ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest" />
        </label>
        <Select<string>
          label="Durum"
          value={filter}
          options={[
            { value: "hepsi", label: "Tüm durumlar" },
            { value: "taslak", label: "Taslak" },
            { value: "aktif", label: "Aktif" },
            { value: "duraklatildi", label: "Duraklatıldı" },
          ]}
          onChange={setFilter}
          className="w-44"
        />
        <Button className="ml-auto" onClick={() => setCreating(true)}>
          <PlusIcon size={16} />
          Otomasyon oluştur
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-panel bg-surface px-6 py-16 text-center ring-1 ring-line">
          <p className="text-lg font-semibold tracking-tight">Henüz otomasyonunuz yok</p>
          <p className="max-w-[30rem] text-muted">Hedef kitlenizi ve amacınızı yazın, Adspine AI ilk e-posta dizinizi yazsın; ya da hazır bir şablonla başlayın.</p>
          <Button onClick={() => setCreating(true)}>Otomasyon oluştur</Button>
        </div>
      ) : (
        <>
        <div className="hidden overflow-x-auto rounded-panel bg-surface ring-1 ring-line md:block">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                {["Ad", "Durum", "İlerleme", "Gönderilen", "Yanıt", "Geri dönen", ""].map((h, i) => (
                  <th key={i} scope="col" className="px-4 py-3 font-medium">
                    {h || <span className="sr-only">Eylemler</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id} className="border-t border-line transition-colors first:border-t-0 hover:bg-sunken/40">
                  <td className="max-w-[20rem] px-4 py-3">
                    <Link href={`/panel/otomasyon/${s.id}`} className="block truncate font-medium underline-offset-4 hover:underline">
                      {s.name}
                    </Link>
                    <span className="block truncate text-xs text-muted">
                      {s.stepCount} adım · {s.enrolled} kişi{s.active ? ` (${s.active} sırada)` : ""}
                    </span>
                    {s.status === "duraklatildi" && s.pausedReason && <span className="block text-xs text-danger">{s.pausedReason}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[s.status]}`}>{statusLabel[s.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    {s.enrolled > 0 ? (
                      <div className="grid w-28 gap-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
                          <div className="h-full rounded-full bg-forest" style={{ width: `${Math.round(((s.enrolled - s.active) / s.enrolled) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted tabular-nums">
                          {s.enrolled - s.active} / {s.enrolled} tamamlandı
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{s.sent}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {s.replied} <span className="text-muted">· {pct(s.replied, s.sent)}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {s.bounced} <span className="text-muted">· {pct(s.bounced, s.sent)}</span>
                  </td>
                  <td className="w-12 px-3 py-3">
                    <div className="flex justify-end">
                      <RowMenu label={`${s.name} için işlemler`} items={menuFor(s)} />
                    </div>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted">
                    Aramaya uyan otomasyon yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ul className="grid gap-3 md:hidden" aria-label="Otomasyonlar">
          {shown.map((x) => (
            <li key={x.id} className="grid gap-3 rounded-panel bg-surface p-4 ring-1 ring-line">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/panel/otomasyon/${x.id}`} className="block truncate font-medium underline-offset-4 hover:underline">
                    {x.name}
                  </Link>
                  <p className="text-xs text-muted">
                    {x.stepCount} adım · {x.enrolled} kişi{x.active ? ` (${x.active} sırada)` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[x.status]}`}>{statusLabel[x.status]}</span>
                  <RowMenu label={`${x.name} için işlemler`} items={menuFor(x)} />
                </div>
              </div>
              {x.status === "duraklatildi" && x.pausedReason && <p className="text-xs text-danger">{x.pausedReason}</p>}
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted">Gönderilen</dt>
                  <dd className="tabular-nums">{x.sent}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Yanıt</dt>
                  <dd className="tabular-nums">
                    {x.replied} <span className="text-muted">· {pct(x.replied, x.sent)}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Geri dönen</dt>
                  <dd className="tabular-nums">
                    {x.bounced} <span className="text-muted">· {pct(x.bounced, x.sent)}</span>
                  </dd>
                </div>
              </dl>
            </li>
          ))}
          {shown.length === 0 && <li className="rounded-panel bg-surface px-4 py-10 text-center text-sm text-muted ring-1 ring-line">Aramaya uyan otomasyon yok.</li>}
        </ul>
        </>
      )}

      <Modal open={renaming !== null} onClose={() => setRenaming(null)} title="Yeniden adlandır" width="26rem">
        {renaming && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void rename();
            }}
          >
            <label className="grid gap-1.5 text-sm font-medium">
              Otomasyon adı
              <input autoFocus value={renaming.name} onChange={(e) => setRenaming({ ...renaming, name: e.target.value })} maxLength={80} className="h-11 w-full min-w-0 rounded-control bg-surface px-3.5 font-normal ring-1 ring-line-strong ring-inset outline-none focus:ring-2 focus:ring-forest" />
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={renameBusy || !renaming.name.trim()}>
                {renameBusy ? "Kaydediliyor…" : "Kaydet"}
              </Button>
              <Button variant="quiet" onClick={() => setRenaming(null)}>
                Vazgeç
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={deleting !== null} onClose={() => setDeleting(null)} title="Otomasyon silinsin mi?" width="26rem">
        {deleting && (
          <div className="grid gap-4">
            <p className="text-sm text-muted">
              <span className="font-medium text-ink">{deleting.name}</span> ve içindeki adımlar kalıcı olarak silinir; bu işlem geri alınamaz. Gönderilmiş e-postalar etkilenmez.
            </p>
            <div className="flex gap-2">
              <Button
                className="bg-danger hover:bg-danger"
                onClick={() => {
                  const target = deleting;
                  setDeleting(null);
                  void remove(target);
                }}
              >
                Sil
              </Button>
              <Button variant="quiet" onClick={() => setDeleting(null)}>
                Vazgeç
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={creating} onClose={() => setCreating(false)} title="Otomasyon oluştur">
        <CreatePanel onCancel={() => setCreating(false)} onCreated={(id) => {
            setCreating(false);
            router.push(`/panel/otomasyon/${id}`);
          }} />
      </Modal>
    </div>
  );
}
