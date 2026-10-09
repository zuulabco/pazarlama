"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapse } from "@/components/ui/collapse";
import { Disclosure } from "@/components/ui/disclosure";
import { AdspineAiIcon, TrashIcon } from "@/components/ui/icons";
import { RotatingTips } from "@/components/ui/rotating-tips";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { ShapeLoader } from "@/components/ui/shape-loader";
import { toast } from "@/components/ui/toast";
import { buildVars, renderTemplate, sampleVars, unfilledVariables, variableCatalog } from "@/modules/outreach/render";
import { delayUnits, describeDelay, splitDelay } from "@/modules/outreach/schedule";
import { blankVariant, emailTypes, maxVariants, stepLabel, type Step, type Variant } from "@/modules/outreach/sequence-schema";
import { checkEmail } from "@/modules/outreach/spam-check";
import type { Contact } from "@/modules/outreach/schema";
import { api } from "../../../kisiler/_components/contact-ui";
import { Field, Toggle, inputClass, insertAtCursor, textareaClass } from "./campaign-ui";

const aiTips = ["İşletme bilgileriniz ve seçimleriniz birleştiriliyor…", "Şablon yazılıyor…", "Spam kalıpları ayıklanıyor…", "Son okuma yapılıyor…"];
const taskHints: Record<string, { title: string; notes: string }> = {
  arama: { title: "Örn. {{company}} firmasını ara", notes: "Aramada söylenecekler, hatırlatmalar…" },
  gorev: { title: "Örn. Teklif dosyasını hazırla", notes: "Ayrıntılar…" },
  whatsapp: { title: "Örn. {{company}} için WhatsApp'tan yaz", notes: "Yazılacak mesaj ya da notlar…" },
  manual_email: { title: "Örn. {{company}} için kişisel e-posta yaz", notes: "E-postada vurgulanacaklar…" },
};

export type Sender = { name: string | null; company: string | null };

function DelayField({ minutes, onChange, first }: { minutes: number; onChange: (m: number) => void; first: boolean }) {
  const { value, unit } = splitDelay(minutes);
  const factor = delayUnits.find((u) => u.value === unit)!.factor;
  return (
    <div className="grid gap-1.5 text-sm font-medium">
      {first ? "Kişi eklendikten sonra" : "Önceki adımdan sonra"}
      <div className="flex flex-wrap items-center gap-2">
        <input
          inputMode="numeric"
          aria-label="Bekleme süresi"
          value={minutes === 0 ? "" : String(value)}
          placeholder="0"
          onChange={(e) => onChange(Math.min(Number(e.target.value.replace(/\D/g, "").slice(0, 3) || 0), 999) * factor)}
          className={`${inputClass} w-24!`}
        />
        <Select<string>
          label="Süre birimi"
          value={unit}
          options={delayUnits.map((u) => ({ value: u.value, label: u.label }))}
          onChange={(u) => onChange(Math.max(value, 1) * delayUnits.find((x) => x.value === u)!.factor)}
          className="w-40"
        />
        <button type="button" onClick={() => onChange(0)} className="text-sm font-normal text-muted underline underline-offset-4 hover:text-ink">
          Hemen
        </button>
      </div>
    </div>
  );
}

/** Bir otomasyon adımı: gecikme, (e-postada) A/B varyantları, yazma modu, şablon, önizleme ve test. */
export function StepCard({
  step,
  index,
  total,
  firstEmailIndex,
  firstSubject,
  firstBody,
  sender,
  onChange,
  onRemove,
  onMove,
  onGripPointerDown,
  dragging,
  onTest,
}: {
  step: Step;
  index: number;
  total: number;
  firstEmailIndex: number;
  firstSubject: string;
  firstBody: string;
  sender: Sender;
  onChange: (s: Step) => void;
  onRemove: () => void;
  /** Klavyeyle sıralama (tutamaçta ↑/↓). */
  onMove: (dir: -1 | 1) => void;
  /** Tutamaçtan sürüklemeyi başlatır (fare ve dokunma). */
  onGripPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  dragging: boolean;
  onTest: (subject: string, body: string) => Promise<void>;
}) {
  const [vi, setVi] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContacts, setPreviewContacts] = useState<Contact[] | null>(null);
  const [previewId, setPreviewId] = useState("");
  const [opener, setOpener] = useState<{ id: string; text: string | null } | null>(null);
  const [openerBusy, setOpenerBusy] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const [focus, setFocus] = useState<"subject" | "body">("body");

  const isEmail = step.kind === "email";
  const v: Variant = step.variants[Math.min(vi, step.variants.length - 1)] ?? blankVariant("A", "tanisma");
  const setVariant = (patch: Partial<Variant>) => onChange({ ...step, variants: step.variants.map((x) => (x.key === v.key ? { ...x, ...patch } : x)) });
  const isFollowUp = isEmail && index > firstEmailIndex && firstEmailIndex >= 0;

  function addVariant() {
    const used = new Set(step.variants.map((x) => x.key));
    const key = (["A", "B", "C"] as const).find((k) => !used.has(k));
    if (!key || step.variants.length >= maxVariants) return;
    onChange({ ...step, variants: [...step.variants, { ...v, key, ai: { ...v.ai } }] });
    setVi(step.variants.length);
    toast(`Test ${key} eklendi: şimdi yalnızca değiştirmek istediğiniz yeri düzenleyin`);
  }

  function removeVariant() {
    if (step.variants.length <= 1) return;
    const next = step.variants.filter((x) => x.key !== v.key);
    onChange({ ...step, variants: next });
    setVi(0);
  }

  async function writeWithAi() {
    if (aiBusy) return;
    if (v.mode === "istem" && !v.ai.extra.trim()) return toast("Ne yazılmasını istediğinizi kısaca anlatın.", { kind: "error" });
    setAiBusy(true);
    const r = await api<{ subject: string; body: string }>("/api/outreach/ai/template", {
      method: "POST",
      body: JSON.stringify({ settings: v.ai, mode: v.mode === "istem" ? "istem" : "asistan", prompt: v.mode === "istem" ? v.ai.extra : undefined, previousSubject: isFollowUp ? firstSubject || undefined : undefined, previousBody: isFollowUp ? firstBody || undefined : undefined }),
    });
    setAiBusy(false);
    if (!r.ok) return toast(r.error, { kind: "error" });
    setVariant({ subject: isFollowUp && !v.subject ? "" : r.data.subject, body: r.data.body });
    toast("Şablon yazıldı: dilediğiniz gibi düzenleyebilirsiniz");
  }

  const vars = (() => {
    const c = previewContacts?.find((x) => x.id === previewId);
    return c ? buildVars(c, sender) : sampleVars;
  })();
  const renderedSubject = renderTemplate(v.subject, vars);
  const renderedBody = renderTemplate(v.body, vars);
  const missing = unfilledVariables(`${v.subject}\n${v.body}`, vars);
  const spam = checkEmail(renderedSubject || (isFollowUp ? firstSubject : ""), renderedBody);

  async function openPreview() {
    setShowPreview((s) => !s);
    if (previewContacts === null) {
      const r = await api<{ contacts: Contact[] }>("/api/outreach/contacts?status=hepsi&page=1");
      setPreviewContacts(r.ok ? r.data.contacts.filter((c) => c.company || c.name) : []);
    }
  }

  async function fetchOpener() {
    if (!previewId || openerBusy) return;
    setOpenerBusy(true);
    const r = await api<{ opener: string | null }>("/api/outreach/ai/opener", { method: "POST", body: JSON.stringify({ contactId: previewId }) });
    setOpenerBusy(false);
    if (!r.ok) return toast(r.error, { kind: "error" });
    setOpener({ id: previewId, text: r.data.opener });
    if (!r.data.opener) toast("Bu kişinin sitesinden güvenle yazılabilecek bir açılış çıkmadı; e-posta açılışsız gider.");
  }

  async function test() {
    setTestBusy(true);
    await onTest(v.subject, v.body).catch(() => undefined);
    setTestBusy(false);
  }

  const delayText = describeDelay(step.delayMinutes);
  const summary = (
    <span className="grid min-w-0 gap-0.5 text-left">
      <span className="flex flex-wrap items-center gap-2 font-semibold tracking-tight">
        {index + 1}. adım · {stepLabel(step.kind)}
        {!step.enabled && <span className="rounded-full bg-sunken px-2 py-0.5 text-xs font-normal text-muted">Kapalı</span>}
      </span>
      <span className="truncate text-sm font-normal text-muted">
        {delayText}
        {isEmail ? ` · ${v.subject || (isFollowUp ? "Önceki konuya Re:" : "Konu yazılmadı")}` : step.task.title ? ` · ${step.task.title}` : ""}
      </span>
    </span>
  );

  return (
    <Disclosure
      defaultOpen={index === 0 || (isEmail && !v.body)}
      className="rounded-panel bg-surface ring-1 ring-line"
      buttonClassName="px-5 py-4"
      panelClassName="px-5 pb-5"
      summary={summary}
      leading={
        <button
          type="button"
          aria-label={`${index + 1}. adımı sürükleyerek sırala (klavyede ↑ ve ↓)`}
          title="Sürükleyerek sırala"
          onPointerDown={onGripPointerDown}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" && index > 0) {
              e.preventDefault();
              onMove(-1);
            } else if (e.key === "ArrowDown" && index < total - 1) {
              e.preventDefault();
              onMove(1);
            }
          }}
          className={`ml-2 grid h-8 w-6 shrink-0 touch-none place-items-center rounded-control text-muted transition-colors hover:bg-sunken hover:text-ink ${dragging ? "cursor-grabbing bg-sunken text-ink" : "cursor-grab"}`}
        >
          <svg viewBox="0 0 12 18" width="12" height="18" aria-hidden="true" fill="currentColor">
            {[3, 9, 15].flatMap((y) => [3, 9].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" />))}
          </svg>
        </button>
      }
      trailing={
        <span className="flex items-center gap-0.5 pr-3">
          <button type="button" aria-label="Adımı sil" onClick={onRemove} className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-danger">
            <TrashIcon size={15} />
          </button>
        </span>
      }
    >
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <DelayField minutes={step.delayMinutes} onChange={(m) => onChange({ ...step, delayMinutes: m })} first={index === 0} />
          <Toggle checked={step.enabled} onChange={(e) => onChange({ ...step, enabled: e })} label="Adım etkin" />
        </div>

        {!isEmail ? (
          <div className="grid gap-4 rounded-row bg-sunken/60 p-4">
            <p className="text-sm text-muted">
              Zamanı gelince bu adım Plan&apos;a <span className="font-medium text-ink">{stepLabel(step.kind)}</span> görevi olarak düşer; otomasyon sonraki adıma geçer. Kişinin e-posta ve telefonu göreve eklenir.
            </p>
            <Field label="Görev başlığı">
              <input value={step.task.title} onChange={(e) => onChange({ ...step, task: { ...step.task, title: e.target.value } })} maxLength={120} placeholder={taskHints[step.kind]?.title} className={inputClass} />
            </Field>
            <Field label="Not (isteğe bağlı)">
              <textarea value={step.task.notes} onChange={(e) => onChange({ ...step, task: { ...step.task, notes: e.target.value } })} maxLength={1000} rows={3} placeholder={taskHints[step.kind]?.notes} className={textareaClass} />
            </Field>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="E-posta varyantları (A/B testi)">
              {step.variants.map((x, i) => (
                <button
                  key={x.key}
                  type="button"
                  role="tab"
                  aria-selected={x.key === v.key}
                  onClick={() => setVi(i)}
                  className="h-9 rounded-full px-4 text-sm ring-1 ring-line-strong ring-inset transition-colors hover:bg-sunken aria-selected:bg-forest aria-selected:font-medium aria-selected:text-white aria-selected:ring-forest"
                >
                  {step.variants.length > 1 ? `Test ${x.key}` : "E-posta"}
                </button>
              ))}
              {step.variants.length < maxVariants && (
                <button type="button" onClick={addVariant} className="h-9 rounded-full px-3.5 text-sm text-accent transition-colors hover:bg-forest-soft">
                  + A/B testi ekle
                </button>
              )}
              {step.variants.length > 1 && (
                <button type="button" onClick={removeVariant} className="ml-auto text-sm text-muted underline underline-offset-4 hover:text-danger">
                  Test {v.key}&apos;yi sil
                </button>
              )}
            </div>
            {step.variants.length > 1 && <p className="-mt-2 text-sm text-muted">Kişiler varyantlara eşit paylaştırılır; hangisinin daha çok yanıt aldığını Rapor sekmesinde görürsünüz.</p>}

            <div className="grid gap-4">
              <Segmented
                label="Yazma yöntemi"
                items={[
                  { key: "sablon", label: "Kendim yazarım", pressed: v.mode === "sablon", onClick: () => setVariant({ mode: "sablon" }) },
                  { key: "asistan", label: "Adspine AI · Seçeneklerle", pressed: v.mode === "asistan", onClick: () => setVariant({ mode: "asistan" }) },
                  { key: "istem", label: "Adspine AI · İstemle", pressed: v.mode === "istem", onClick: () => setVariant({ mode: "istem" }) },
                ]}
              />

              <Collapse open={v.mode !== "sablon"}>
                <div className="grid gap-4 rounded-row bg-forest-soft/50 p-4">
                  {aiBusy ? (
                    <div role="status" className="flex items-center gap-4 py-2">
                      <ShapeLoader size="sm" />
                      <RotatingTips tips={aiTips} label={null} />
                    </div>
                  ) : (
                    <>
                      {v.mode === "asistan" ? (
                        <div className="grid gap-4">
                          <div className="grid gap-4 sm:grid-cols-3">
                            <div className="grid gap-1.5 text-sm font-medium">
                              E-posta türü
                              <Select<string> label="E-posta türü" value={v.ai.type} options={emailTypes.map((t) => ({ value: t.value, label: t.label }))} onChange={(t) => setVariant({ ai: { ...v.ai, type: t as Variant["ai"]["type"] } })} />
                            </div>
                            <div className="grid gap-1.5 text-sm font-medium">
                              Ton
                              <Select<string>
                                label="Ton"
                                value={v.ai.tone}
                                options={[
                                  { value: "samimi", label: "Samimi" },
                                  { value: "profesyonel", label: "Profesyonel" },
                                  { value: "net", label: "Net ve kısa" },
                                ]}
                                onChange={(t) => setVariant({ ai: { ...v.ai, tone: t as Variant["ai"]["tone"] } })}
                              />
                            </div>
                            <div className="grid gap-1.5 text-sm font-medium">
                              Uzunluk
                              <Select<string>
                                label="Uzunluk"
                                value={v.ai.length}
                                options={[
                                  { value: "kisa", label: "Kısa" },
                                  { value: "standart", label: "Standart" },
                                  { value: "ayrintili", label: "Ayrıntılı" },
                                ]}
                                onChange={(t) => setVariant({ ai: { ...v.ai, length: t as Variant["ai"]["length"] } })}
                              />
                            </div>
                          </div>
                          <Field label="Mesajda olmasını istedikleriniz (isteğe bağlı)">
                            <textarea value={v.ai.extra} onChange={(e) => setVariant({ ai: { ...v.ai, extra: e.target.value } })} maxLength={500} rows={2} placeholder="Örn. Cuma günü görüşmeyi öner, yeni kurulan şirketlere ilk yıl desteğinden söz et" className={textareaClass} />
                          </Field>
                        </div>
                      ) : (
                        <Field label="Ne yazılsın?" hint="Kendi cümlelerinizle anlatın; Adspine AI bunu kurallara uygun bir e-posta şablonuna çevirir.">
                          <textarea value={v.ai.extra} onChange={(e) => setVariant({ ai: { ...v.ai, extra: e.target.value } })} maxLength={500} rows={3} placeholder="Örn. Yeni kurulan şirketlere ilk yıl muhasebe desteği öneriyorum; kısa ve samimi olsun, kahve içmeyi teklif et" className={textareaClass} />
                        </Field>
                      )}
                      <Button onClick={() => void writeWithAi()} className="w-fit">
                        <AdspineAiIcon size={18} tone="mono" eye="var(--color-forest)" />
                        {v.body ? "Yeniden yaz" : "Adspine AI ile yaz"}
                      </Button>
                    </>
                  )}
                </div>
              </Collapse>

              <Field label="Konu" hint={isFollowUp ? "Boş bırakırsanız ilk e-postanın konusuna “Re:” ile bağlanır (aynı konuşmada görünür)." : undefined}>
                <input
                  ref={subjectRef}
                  value={v.subject}
                  onChange={(e) => setVariant({ subject: e.target.value })}
                  onFocus={() => setFocus("subject")}
                  maxLength={150}
                  placeholder={isFollowUp ? "Boş: önceki konuya Re: ile bağlanır" : "Örn. {{company|Sizin için}} kısa bir soru"}
                  className={inputClass}
                />
              </Field>

              <div className="grid gap-2">
                <Field label="Mesaj">
                  <textarea
                    ref={bodyRef}
                    value={v.body}
                    onChange={(e) => setVariant({ body: e.target.value })}
                    onFocus={() => setFocus("body")}
                    rows={10}
                    maxLength={5000}
                    placeholder={"Merhaba {{first_name|}},\n\n…"}
                    className={textareaClass}
                  />
                </Field>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs text-muted">Değişken ekle:</span>
                  {variableCatalog.map((vc) => (
                    <button
                      key={vc.key}
                      type="button"
                      onClick={() => {
                        const token = vc.key.endsWith("name") && !vc.key.startsWith("sender") ? `{{${vc.key}|}}` : `{{${vc.key}}}`;
                        if (focus === "subject") insertAtCursor(subjectRef.current, v.subject, token, (s) => setVariant({ subject: s }));
                        else insertAtCursor(bodyRef.current, v.body, token, (s) => setVariant({ body: s }));
                      }}
                      className="h-7 rounded-full bg-sunken px-2.5 text-xs transition-colors hover:bg-forest-soft hover:text-accent"
                    >
                      {vc.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted">İmzanız ve çıkış satırı (“İPTAL” yazarak yanıtlayın) her e-postaya otomatik eklenir; mesaja yazmayın.</p>
              </div>

              <Toggle
                checked={v.opener}
                onChange={(o) => setVariant({ opener: o })}
                label="Her kişi için kişisel açılış cümlesi ekle (Adspine AI)"
                hint="Web sitesi olan kişilerde, sitesinde okunanlara dayanan tek bir cümle selamlamadan sonra eklenir. Site yoksa ya da güvenli bir şey çıkmazsa eklenmez."
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => void openPreview()}>
                {showPreview ? "Önizlemeyi kapat" : "Önizle ve denetle"}
              </Button>
              <Button variant="secondary" onClick={() => void test()} disabled={testBusy || !v.body.trim()}>
                {testBusy ? "Gönderiliyor…" : "Bana test e-postası gönder"}
              </Button>
              <span className={`ml-auto rounded-full px-3 py-1 text-xs font-medium ${spam.label === "İyi" ? "bg-forest-soft text-accent" : spam.label === "Riskli" ? "bg-danger-soft text-danger" : "bg-pollen/50 text-ink"}`}>
                Spam riski: {spam.label} ({spam.score})
              </span>
            </div>

            <Collapse open={showPreview}>
              <div className="grid gap-4 rounded-row bg-sunken/60 p-4">
                <div className="grid gap-1.5 text-sm font-medium sm:max-w-sm">
                  Önizleme kişisi
                  <Select<string>
                    label="Önizleme kişisi"
                    value={previewId}
                    options={[{ value: "", label: "Örnek kişi (Ayşe · Lale Diş Kliniği)" }, ...(previewContacts ?? []).map((c) => ({ value: c.id, label: c.company ?? c.name ?? c.email ?? "Kişi", hint: c.email ?? undefined }))]}
                    onChange={setPreviewId}
                  />
                </div>
                <div className="grid gap-2 rounded-control bg-surface p-4 ring-1 ring-line">
                  <p className="text-sm text-muted">
                    Konu: <span className="font-medium text-ink">{renderedSubject || (isFollowUp ? `Re: ${firstSubject}` : "(yok)")}</span>
                  </p>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {v.opener && opener?.id === previewId && opener.text ? `${renderedBody.split("\n")[0]}\n\n${opener.text}\n${renderedBody.split("\n").slice(1).join("\n")}` : renderedBody || "(mesaj boş)"}
                  </div>
                </div>
                {v.opener && previewId && (
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <Button variant="quiet" onClick={() => void fetchOpener()} disabled={openerBusy}>
                      <AdspineAiIcon size={18} />
                      {openerBusy ? "Site okunuyor…" : "Bu kişi için açılışı getir"}
                    </Button>
                    {opener?.id === previewId && !opener.text && <span className="text-muted">Güvenle yazılabilecek bir açılış çıkmadı.</span>}
                  </div>
                )}
                {missing.length > 0 && (
                  <p role="status" className="rounded-control bg-pollen/50 px-3 py-2 text-sm">
                    Bu kişide boş kalacak değişkenler: {missing.join(", ")}. Yedek metin yazmak için {"{{ad|Merhaba}}"} biçimini kullanın.
                  </p>
                )}
                {spam.issues.length > 0 ? (
                  <ul className="grid gap-1.5 text-sm">
                    {spam.issues.map((i) => (
                      <li key={i.text} className="flex gap-2">
                        <span className={i.level === "uyari" ? "text-danger" : "text-muted"} aria-hidden="true">
                          {i.level === "uyari" ? "!" : "·"}
                        </span>
                        {i.text}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-accent">Denetimde dikkat çeken bir şey yok.</p>
                )}
              </div>
            </Collapse>
          </>
        )}
      </div>
    </Disclosure>
  );
}

