"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ActionLink } from "@/components/ui/action-link";
import { Button } from "@/components/ui/button";
import { ChatIcon, CheckIcon, CopyIcon, MailIcon, SparkleIcon } from "@/components/ui/icons";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { toast, Toaster } from "@/components/ui/toast";
import { goals, tones, whatsappHref, type Draft, type Goal, type Tone, type WorkFirm, type WorkKind } from "@/modules/work/context";
import { ShapeLoader } from "../../musteri-bul/_components/shape-loader";

type PickerItem = { id: string; name: string; district: string | null; category: string | null };
type Service = { value: string; label: string };

const kindLabel: Record<WorkKind, string> = { message: "WhatsApp / DM mesajı", email: "E-posta" };

function ContextCard({ firm }: { firm: WorkFirm }) {
  return (
    <aside aria-label="Firma bilgileri" className="grid gap-4 rounded-panel bg-surface p-5 ring-1 ring-line lg:sticky lg:top-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{firm.name}</h2>
        <p className="text-sm text-muted">{[firm.category, firm.district].filter(Boolean).join(" · ")}</p>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Taslakta kullanılacak bilgiler</p>
        <ul className="grid gap-2 text-sm">
          {firm.signals.map((s) => (
            <li key={s} className="flex gap-2.5 text-muted">
              <span className="mt-0.5 text-forest">
                <CheckIcon size={16} />
              </span>
              {s}
            </li>
          ))}
        </ul>
      </div>
      {(firm.phone || firm.email) && (
        <div>
          <p className="mb-2 text-sm font-medium">İletişim</p>
          <ul className="grid gap-1 text-sm text-muted">
            {firm.phone && <li>{firm.phone}</li>}
            {firm.email && <li className="break-all">{firm.email}</li>}
          </ul>
        </div>
      )}
      {firm.notes.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Notlarım</p>
          <ul className="grid gap-1.5">
            {firm.notes.slice(0, 3).map((n, i) => (
              <li key={i} className="line-clamp-3 rounded-control bg-sunken/70 px-3 py-2 text-sm whitespace-pre-line">
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted">Not eklemek taslakları iyileştirir: notlarınız da kullanılır. Notları Takip sayfasından ekleyebilirsiniz.</p>
      <Link href="/panel/firmalar" className="w-fit text-sm font-medium text-forest underline underline-offset-4 hover:no-underline">
        Takip listesinde aç
      </Link>
    </aside>
  );
}

function Tool({ firm, tool, services, suggestedService }: { firm: WorkFirm; tool: WorkKind; services: Service[]; suggestedService: string | null }) {
  const [goal, setGoal] = useState<Goal>("ilk-temas");
  const [tone, setTone] = useState<Tone>("samimi");
  const [service, setService] = useState(suggestedService ?? "");
  const [drafts, setDrafts] = useState<Record<WorkKind, Draft | null>>({ message: null, email: null });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const draft = drafts[tool];
  const setDraft = (patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [tool]: { ...(d[tool] as Draft), ...patch } }));

  async function generate() {
    if (busy) return;
    setBusy(true);
    setSent(false);
    try {
      const res = await fetch("/api/work/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoriteId: firm.id, kind: tool, goal, tone, service: service || null }),
      });
      const body = (await res.json().catch(() => null)) as (Draft & { error?: string }) | null;
      if (!res.ok || !body || body.error) throw new Error(body?.error ?? "Taslak hazırlanamadı. Tekrar deneyin.");
      setDrafts((d) => ({ ...d, [tool]: { subject: body.subject, body: body.body } }));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Taslak hazırlanamadı. Tekrar deneyin.", { kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!draft) return;
    const text = draft.subject ? `Konu: ${draft.subject}\n\n${draft.body}` : draft.body;
    try {
      await navigator.clipboard.writeText(text);
      toast("Taslak kopyalandı");
    } catch {
      toast("Kopyalanamadı. Metni seçip elle kopyalayın.", { kind: "error" });
    }
  }

  async function markSent() {
    if (!draft) return;
    try {
      const note = `${kindLabel[tool]} gönderildi: "${draft.body.replace(/\s+/g, " ").slice(0, 150)}${draft.body.length > 150 ? "…" : ""}"`;
      const noted = await fetch(`/api/favorites/${firm.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: note }),
      });
      if (!noted.ok) throw new Error("Takip'e işlenemedi. Tekrar deneyin.");
      if (firm.status === "takipte") {
        await fetch(`/api/favorites/${firm.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "iletisim" }),
        });
      }
      setSent(true);
      toast("Takip'e işlendi", { action: { label: "Takip listesi", href: "/panel/firmalar" } });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Takip'e işlenemedi. Tekrar deneyin.", { kind: "error" });
    }
  }

  const wa = tool === "message" && draft ? whatsappHref(firm.phone, draft.body) : null;
  const mailto = tool === "email" && draft ? `mailto:${firm.email ?? ""}?subject=${encodeURIComponent(draft.subject ?? "")}&body=${encodeURIComponent(draft.body)}` : null;

  return (
    <section aria-label="Taslak aracı" className="grid gap-5 rounded-panel bg-surface p-5 ring-1 ring-line sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <p className="text-sm font-medium">Amaç</p>
          <Select<Goal> label="Amaç" value={goal} options={goals.map((g) => ({ value: g.value, label: g.label }))} onChange={setGoal} />
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-medium">Ton</p>
          <Segmented label="Ton" items={tones.map((t) => ({ key: t.value, label: t.label, pressed: tone === t.value, onClick: () => setTone(t.value) }))} />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <p className="text-sm font-medium">Önerilecek hizmet</p>
          <Select<string>
            label="Önerilecek hizmet"
            value={service}
            options={[{ value: "", label: "Belirli bir hizmet yok" }, ...services]}
            onChange={setService}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={generate} disabled={busy}>
          <SparkleIcon size={16} />
          {busy ? "Hazırlanıyor…" : draft ? "Yeniden oluştur" : "Taslak oluştur"}
        </Button>
        {draft && !busy && <p className="text-sm text-muted">Metni dilediğiniz gibi düzenleyebilirsiniz.</p>}
      </div>

      {busy && (
        <div role="status" className="flex items-center gap-4 rounded-row bg-forest-soft px-5 py-4">
          <ShapeLoader size="sm" />
          <p className="text-sm">Müşteri bilgileriniz ve profiliniz birleştirilip taslak hazırlanıyor…</p>
        </div>
      )}

      {draft && !busy && (
        <div className="grid gap-3.5">
          {tool === "email" && (
            <label className="grid gap-1.5 text-sm font-medium">
              Konu
              <input
                value={draft.subject ?? ""}
                maxLength={140}
                onChange={(e) => setDraft({ subject: e.target.value })}
                className="h-11 rounded-control bg-surface px-3.5 font-normal ring-1 ring-line-strong ring-inset outline-none focus:ring-2 focus:ring-forest"
              />
            </label>
          )}
          <label className="grid gap-1.5 text-sm font-medium">
            {tool === "email" ? "E-posta metni" : "Mesaj"}
            <textarea
              value={draft.body}
              rows={tool === "email" ? 12 : 7}
              onChange={(e) => setDraft({ body: e.target.value })}
              className="resize-y rounded-row bg-surface px-3.5 py-3 font-normal leading-relaxed ring-1 ring-line-strong ring-inset outline-none focus:ring-2 focus:ring-forest"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium ring-1 ring-line-strong ring-inset transition-colors hover:bg-forest-soft hover:text-forest"
            >
              <CopyIcon />
              Kopyala
            </button>
            {wa && <ActionLink href={wa} external icon={<ChatIcon />} label="WhatsApp'ta aç" />}
            {tool === "message" && !wa && <span className="text-sm text-muted">Telefon numarası olmadığı için WhatsApp bağlantısı yok.</span>}
            {mailto && <ActionLink href={mailto} icon={<MailIcon />} label="E-posta uygulamasında aç" />}
            <button
              type="button"
              onClick={markSent}
              disabled={sent}
              className="ml-auto inline-flex h-9 items-center gap-2 rounded-full bg-forest px-4 text-sm font-medium text-white transition-colors hover:bg-forest-hover disabled:opacity-60"
            >
              <CheckIcon />
              {sent ? "Takip'e işlendi" : "Gönderdim"}
            </button>
          </div>
          {tool === "email" && (
            <p className="text-xs text-muted">
              E-postanın sonuna alıcıya çıkış hakkı veren bir satır eklenir. Ticari ileti göndermeden önce ilgili mevzuata uygunluk sizin sorumluluğunuzdadır.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export function WorkWorkspace({
  favorites,
  firm,
  tool,
  services,
  suggestedService,
}: {
  favorites: PickerItem[];
  firm: WorkFirm | null;
  tool: WorkKind;
  services: Service[];
  suggestedService: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function go(id: string | null, nextTool: WorkKind) {
    const q = new URLSearchParams();
    if (id) q.set("firma", id);
    if (nextTool === "email") q.set("arac", "email");
    start(() => router.replace(`/panel/calis${q.size ? `?${q}` : ""}`, { scroll: false }));
  }

  if (favorites.length === 0) {
    return (
      <div className="grid justify-items-center gap-4 rounded-panel bg-surface px-6 py-16 text-center ring-1 ring-line">
        <Toaster />
        <p className="text-lg font-semibold tracking-tight">Önce bir müşteri seçin</p>
        <p className="max-w-[30rem] text-muted">
          İletişim kur, takibe aldığınız firmalar için kişiselleştirilmiş mesaj ve e-posta hazırlar. Müşteri bul sayfasından bir firmayı takibe alın.
        </p>
        <Link href="/panel/musteri-bul" className="inline-flex h-11 items-center rounded-control bg-forest px-5 font-medium text-white hover:bg-forest-hover">
          Müşteri bul&apos;a git
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Toaster />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,26rem)_auto] sm:items-end sm:gap-5">
        <div className="grid gap-2">
          <p className="text-sm font-medium">Müşteri</p>
          <Select<string>
            label="Müşteri seç"
            value={firm?.id ?? ""}
            options={[
              { value: "", label: "Müşteri seçin" },
              ...favorites.map((f) => ({ value: f.id, label: f.name, hint: [f.category, f.district].filter(Boolean).join(" · ") || undefined })),
            ]}
            onChange={(id) => go(id || null, tool)}
          />
        </div>
        {firm && (
          <Segmented
            label="Araç"
            items={[
              { key: "message", label: "Mesaj", pressed: tool === "message", onClick: () => go(firm.id, "message") },
              { key: "email", label: "E-posta", pressed: tool === "email", onClick: () => go(firm.id, "email"), disabled: !firm.email },
            ]}
          />
        )}
      </div>
      {firm && !firm.email && <p className="-mt-2 text-sm text-muted">Bu firmanın kayıtlı bir e-posta adresi yok; yalnızca mesaj taslağı hazırlanabilir.</p>}

      {!firm ? (
        <div className="rounded-panel bg-surface p-6 ring-1 ring-line">
          <p className="font-medium">Takibinizdeki bir müşteriyi seçin</p>
          <p className="mt-1 text-sm text-muted">Seçtiğiniz firmanın bilgileriyle kişiselleştirilmiş bir mesaj ya da e-posta taslağı hazırlanır.</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {favorites.slice(0, 8).map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => go(f.id, tool)}
                  className="h-9 rounded-full bg-sunken px-4 text-sm transition-colors hover:bg-forest-soft hover:text-forest"
                >
                  {f.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className={`grid items-start gap-6 transition-opacity duration-200 lg:grid-cols-[22rem_minmax(0,1fr)] ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
          <ContextCard firm={firm} />
          <Tool key={firm.id} firm={firm} tool={tool} services={services} suggestedService={suggestedService} />
        </div>
      )}
    </div>
  );
}
