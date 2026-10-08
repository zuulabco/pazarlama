"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, SparkleIcon } from "@/components/ui/icons";
import { RotatingTips } from "@/components/ui/rotating-tips";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { ShapeLoader } from "@/components/ui/shape-loader";
import { TextArea } from "@/components/ui/text-fields";
import { toast } from "@/components/ui/toast";
import { goals, lengths, refinements, tones, type Draft, type Goal, type Length, type Refinement, type Tone, type WorkFirm, type WorkKind } from "@/modules/work/context";
import Link from "next/link";
import { FirmInfo } from "./firm-info";
import { SendBox } from "./send-box";

type Service = { value: string; label: string };
export type PickerItem = { id: string; name: string; district: string | null; category: string | null };

const writingTips = [
  "İşletme bilgileriniz ve amacınız birleştiriliyor…",
  "Seçtiğiniz tona göre cümleler kuruluyor…",
  "Yazım ve ek hataları denetleniyor…",
  "Son okuma yapılıyor…",
];
const refineTips = ["İsteğiniz uygulanıyor…", "Cümleler yeniden kuruluyor…", "Yazım denetimi yapılıyor…"];

const inputClass =
  "h-11 w-full min-w-0 rounded-control bg-surface px-3.5 font-normal ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest";

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

type RunRequest = {
  refine?: { action?: Refinement; custom?: string; draft: Draft };
};

/**
 * Mesaj oluşturucu: solda ne yazılacağı (kanal, amaç, ton, uzunluk, hizmet, alıcı bilgisi), sağda sonuç.
 * Sonuç düzenlenebilir, tek tıkla yeniden yazdırılabilir ve oradan WhatsApp'a ya da e-postaya gönderilir.
 */
export function Composer({
  favorites,
  firm,
  onPickFirm,
  initialKind,
  services,
  suggestedService,
}: {
  favorites: PickerItem[];
  firm: WorkFirm | null;
  onPickFirm: (id: string) => void;
  initialKind: WorkKind;
  services: Service[];
  suggestedService: string | null;
}) {
  const [kind, setKind] = useState<WorkKind>(initialKind);
  const [goal, setGoal] = useState<Goal>("ilk-temas");
  const [tone, setTone] = useState<Tone>("samimi");
  const [length, setLength] = useState<Length>("standart");
  const [service, setService] = useState(suggestedService ?? "");
  const [extra, setExtra] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [about, setAbout] = useState("");
  const [custom, setCustom] = useState("");
  /** Her kanal için sürüm geçmişi; sonuncusu görünendir ("Geri al" bir öncekine döner). */
  const [history, setHistory] = useState<Record<WorkKind, Draft[]>>({ message: [], email: [] });
  const [busy, setBusy] = useState<"write" | "refine" | null>(null);

  // Alıcı değişince eski alıcıya yazılmış taslaklar temizlenir; ayarlar (amaç, ton…) korunur.
  const [recipientId, setRecipientId] = useState(firm?.id ?? "");
  if ((firm?.id ?? "") !== recipientId) {
    setRecipientId(firm?.id ?? "");
    setHistory({ message: [], email: [] });
    setService(suggestedService ?? "");
  }

  const versions = history[kind];
  const draft = versions.at(-1) ?? null;

  const push = (d: Draft) => setHistory((h) => ({ ...h, [kind]: [...h[kind], d] }));
  /** Kullanıcının elle yazdığı değişiklik sürümü çoğaltmaz; son sürümün üzerine yazılır. */
  const edit = (patch: Partial<Draft>) =>
    setHistory((h) => ({ ...h, [kind]: h[kind].map((d, i, all) => (i === all.length - 1 ? { ...d, ...patch } : d)) }));

  async function run(request: RunRequest) {
    if (busy) return;
    setBusy(request.refine ? "refine" : "write");
    try {
      const res = await fetch("/api/work/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          goal,
          tone,
          length,
          service: service || null,
          extra: extra.trim() || null,
          favoriteId: firm?.id || null,
          recipient: firm ? null : { name: name.trim() || null, category: category.trim() || null, about: about.trim() || null },
          ...request,
        }),
      });
      const body = (await res.json().catch(() => null)) as (Draft & { error?: string }) | null;
      if (!res.ok || !body || body.error) throw new Error(body?.error ?? "Mesaj hazırlanamadı. Tekrar deneyin.");
      push({ subject: body.subject, body: body.body });
      if (request.refine) setCustom("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Mesaj hazırlanamadı. Tekrar deneyin.", { kind: "error" });
    } finally {
      setBusy(null);
    }
  }

  const refine = (patch: { action?: Refinement; custom?: string }) => draft && run({ refine: { ...patch, draft } });

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <section aria-label="Mesaj ayarları" className="grid gap-5 rounded-panel bg-surface p-5 ring-1 ring-line sm:p-6">
        <div className="grid gap-2">
          <p className="text-sm font-medium">Kanal</p>
          <Segmented
            label="Kanal"
            items={[
              { key: "message", label: "WhatsApp / DM", pressed: kind === "message", onClick: () => setKind("message") },
              { key: "email", label: "E-posta", pressed: kind === "email", onClick: () => setKind("email") },
            ]}
          />
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-medium">Amaç</p>
          <Select<Goal> label="Amaç" value={goal} options={goals.map((g) => ({ value: g.value, label: g.label }))} onChange={setGoal} />
        </div>

        <div className="grid gap-5">
          <div className="grid gap-2">
            <p className="text-sm font-medium">Ton</p>
            <Segmented label="Ton" items={tones.map((t) => ({ key: t.value, label: t.label, pressed: tone === t.value, onClick: () => setTone(t.value) }))} />
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Uzunluk</p>
            <Segmented label="Uzunluk" items={lengths.map((l) => ({ key: l.value, label: l.label, pressed: length === l.value, onClick: () => setLength(l.value) }))} />
          </div>
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-medium">Önerilecek hizmet</p>
          <Select<string> label="Önerilecek hizmet" value={service} options={[{ value: "", label: "Belirli bir hizmet yok" }, ...services]} onChange={setService} />
        </div>

        <div className="grid gap-4 rounded-row bg-sunken/60 p-4">
          <p className="text-sm font-medium">Alıcı hakkında</p>
          <Select<string>
            label="Alıcı"
            value={firm?.id ?? ""}
            options={[
              { value: "", label: "Müşteri seçmeden yaz", hint: "Genel bir mesaj hazırlar" },
              ...favorites.map((f) => ({ value: f.id, label: f.name, hint: [f.category, f.district].filter(Boolean).join(" · ") || undefined })),
            ]}
            onChange={onPickFirm}
          />
          {favorites.length === 0 && (
            <p className="-mt-2 text-sm text-muted">
              Takibe aldığınız firmaları buradan seçebilirsiniz.{" "}
              <Link href="/panel/musteri-bul" className="font-medium text-accent underline underline-offset-4 hover:no-underline">
                Müşteri bul
              </Link>
            </p>
          )}
          {firm ? (
            <FirmInfo firm={firm} />
          ) : (
            <>
              <label className="grid gap-1.5 text-sm">
                Firma ya da kişi
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Örn. Lale Diş Kliniği" className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-sm">
                Sektör
                <input value={category} onChange={(e) => setCategory(e.target.value)} maxLength={80} placeholder="Örn. Diş kliniği" className={inputClass} />
              </label>
              <TextArea
                label="Bildikleriniz"
                hint="Ne kadar bilgi verirseniz mesaj o kadar kişisel olur."
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                maxLength={500}
                placeholder="Örn. Yeni şube açıyorlar, Instagram'larını yeni yenilemişler."
              />
            </>
          )}
        </div>

        <TextArea
          label="Mesajda olmasını istedikleriniz"
          hint="İsteğe bağlı. Kendi cümlelerinizle yazın."
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          maxLength={300}
          placeholder="Örn. Cuma günü uygun olduğumu belirt."
        />

        {/* Düğme, uzun formda aşağı kaydırmadan hep görünür kalır. */}
        <div className="sticky bottom-0 z-10 -mx-5 -mb-5 rounded-b-panel bg-surface/95 px-5 pt-3 pb-5 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 sm:pb-6">
          <Button onClick={() => run({})} disabled={busy !== null} size="lg" className="w-full">
            <SparkleIcon size={18} />
            {busy === "write" ? "Yazılıyor…" : draft ? "Yeniden oluştur" : "Mesajı oluştur"}
          </Button>
        </div>
      </section>

      <section aria-label="Mesaj" className="grid gap-5 rounded-panel bg-surface p-5 ring-1 ring-line sm:p-6" aria-busy={busy !== null}>
        {busy === "write" ? (
          <div role="status" className="grid min-h-[22rem] place-items-center">
            <div className="grid justify-items-center gap-8">
              <ShapeLoader />
              <RotatingTips tips={writingTips} label={null} />
            </div>
          </div>
        ) : !draft ? (
          <div className="grid min-h-[22rem] content-center justify-items-center gap-4 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-forest-soft text-accent">
              <SparkleIcon size={22} />
            </span>
            <div className="grid gap-1.5">
              <p className="text-lg font-semibold tracking-tight">Mesajınız burada görünecek</p>
              <p className="mx-auto max-w-[28rem] text-muted">
                Soldan amacı, tonu ve uzunluğu seçin. Adspine, işletmenize ve alıcıya göre gönderilmeye hazır bir mesaj yazar.
              </p>
            </div>
            <ul className="grid max-w-[28rem] gap-2 text-left text-sm text-muted">
              {["Yazım ve ek hataları otomatik denetlenir", "Beğenmediğiniz yeri tek tıkla yeniden yazdırırsınız", "Hazır olunca WhatsApp'ta ya da e-postada açılır"].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span className="mt-0.5 text-accent">
                    <CheckIcon size={16} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <div className="grid gap-3.5">
              {kind === "email" && (
                <label className="grid gap-1.5 text-sm font-medium">
                  Konu
                  <input value={draft.subject ?? ""} maxLength={140} onChange={(e) => edit({ subject: e.target.value })} className={inputClass} />
                </label>
              )}
              <label className="grid gap-1.5 text-sm font-medium">
                {kind === "email" ? "E-posta metni" : "Mesaj"}
                <textarea
                  value={draft.body}
                  rows={kind === "email" ? 12 : 8}
                  onChange={(e) => edit({ body: e.target.value })}
                  disabled={busy === "refine"}
                  className="resize-y rounded-row bg-surface px-3.5 py-3 font-normal leading-relaxed ring-1 ring-line-strong ring-inset outline-none focus:ring-2 focus:ring-forest disabled:opacity-60"
                />
              </label>
              <p className="-mt-1 text-right text-xs text-muted tabular-nums">{wordCount(draft.body)} kelime · dilediğiniz gibi düzenleyebilirsiniz</p>
            </div>

            <div className="grid gap-3">
              <p className="text-sm font-medium">Beğenmediniz mi? Yeniden yazdırın</p>
              <div className="flex flex-wrap gap-2">
                {refinements.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => refine({ action: r.value })}
                    className="h-9 rounded-full bg-sunken px-3.5 text-sm transition-colors hover:bg-forest-soft hover:text-accent disabled:opacity-50"
                  >
                    {r.label}
                  </button>
                ))}
                {versions.length > 1 && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => setHistory((h) => ({ ...h, [kind]: h[kind].slice(0, -1) }))}
                    className="h-9 rounded-full px-3.5 text-sm text-muted ring-1 ring-line-strong ring-inset transition-colors hover:text-ink disabled:opacity-50"
                  >
                    Geri al
                  </button>
                )}
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (custom.trim()) refine({ custom: custom.trim() });
                }}
              >
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  maxLength={200}
                  aria-label="Kendi isteğiniz"
                  placeholder="Kendi isteğinizi yazın (örn. Cuma görüşmeyi öner)"
                  className={`${inputClass} min-w-0 flex-1`}
                />
                <Button type="submit" variant="secondary" disabled={busy !== null || !custom.trim()}>
                  Uygula
                </Button>
              </form>
              {busy === "refine" && (
                <div role="status" className="flex items-center gap-4 rounded-row bg-forest-soft px-5 py-3">
                  <ShapeLoader size="sm" />
                  <RotatingTips tips={refineTips} label={null} />
                </div>
              )}
            </div>

            <SendBox key={kind} kind={kind} draft={draft} firm={firm} />
          </>
        )}
      </section>
    </div>
  );
}
