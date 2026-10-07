"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  coerceConfig,
  languages,
  needsPhoneNumberId,
  needsSender,
  sheetHeaders,
  validateConfig,
  type ConfigErrors,
  type SupportConfig,
} from "@/modules/support/config";
import { importSteps, integrationsFor, testMessages, troubleshooting, type Integration } from "@/modules/support/guide";
import { buildWorkflow, credentialSlots, workflowFileName } from "@/modules/support/workflow";
import { RichText } from "./rich-text";
import { useStoredState } from "./use-stored-state";

type State = { config: SupportConfig; step: number; checked: Record<string, boolean> };

function parseState(raw: unknown): State {
  const src = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const checked: Record<string, boolean> = {};
  if (typeof src.checked === "object" && src.checked !== null) {
    for (const [k, v] of Object.entries(src.checked)) if (v === true) checked[k] = true;
  }
  const step = typeof src.step === "number" && src.step >= 0 && src.step <= 3 ? Math.floor(src.step) : 0;
  return { config: coerceConfig(src.config), step, checked };
}

const stepNames = ["Seçimleriniz", "Hesaplar", "İçe aktarma", "Deneme"] as const;

const fieldClass =
  "rounded-control bg-surface px-3.5 ring-1 ring-line-strong ring-inset transition-shadow outline-none placeholder:text-muted focus:ring-2 focus:ring-forest aria-invalid:ring-danger";

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 shrink-0 accent-forest"
      />
      <span className={checked ? "text-muted" : ""}>{children}</span>
    </label>
  );
}

/** Açılıp kapanan seçim kartı: açıkken altındaki alanları gösterir. */
function Toggle({
  title,
  text,
  on,
  onChange,
  children,
}: {
  title: string;
  text: string;
  on: boolean;
  onChange: (v: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className={`rounded-row p-4 ring-1 transition-colors ${on ? "bg-forest-soft/50 ring-forest" : "bg-surface ring-line"}`}>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-4 shrink-0 accent-forest" />
        <span>
          <span className="block font-medium">{title}</span>
          <span className="block text-sm text-muted">{text}</span>
        </span>
      </label>
      {on && children ? <div className="mt-4 grid gap-4 border-t border-line pt-4">{children}</div> : null}
    </div>
  );
}

function Group({ title, error, children }: { title: string; error?: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-base font-semibold">{title}</legend>
      {children}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          /* pano erişimi yok: kullanıcı metni elle seçebilir */
        }
      }}
    >
      {done ? "Kopyalandı" : label}
    </Button>
  );
}

export function SetupWizard() {
  const [state, update] = useStoredState("sinyal.destek.v1", parseState);
  const { config, step, checked } = state;
  const [attempted, setAttempted] = useState(false);
  // İlk "devam" denemesinden sonra hatalar, kullanıcı düzelttikçe canlı güncellenir.
  const errors: ConfigErrors = attempted ? validateConfig(config) : {};

  const set = <K extends keyof SupportConfig>(key: K, value: SupportConfig[K]) =>
    update((s) => ({ ...s, config: { ...s.config, [key]: value } }));
  const go = (n: number) => update((s) => ({ ...s, step: n }));
  const tick = (id: string, v: boolean) => update((s) => ({ ...s, checked: { ...s.checked, [id]: v } }));

  const integrations = useMemo(() => integrationsFor(config), [config]);

  function next() {
    if (step === 0) {
      setAttempted(true);
      if (Object.keys(validateConfig(config)).length > 0) return;
    }
    go(Math.min(step + 1, 3));
    document.getElementById("kurulum")?.scrollIntoView({ block: "start" });
  }

  function download() {
    const blob = new Blob([JSON.stringify(buildWorkflow(config), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = workflowFileName;
    a.click();
    URL.revokeObjectURL(url);
    tick("downloaded", true);
  }

  return (
    <div className="rounded-panel bg-surface ring-1 ring-line">
      <ol className="grid grid-cols-4 border-b border-line">
        {stepNames.map((name, i) => (
          <li key={name}>
            <button
              type="button"
              aria-current={i === step ? "step" : undefined}
              onClick={() => go(i)}
              className={`flex w-full flex-col items-center gap-1 px-1 py-4 text-xs transition-colors sm:flex-row sm:justify-center sm:gap-2.5 sm:text-sm ${
                i === step ? "font-semibold text-ink" : "text-muted hover:text-ink"
              }`}
            >
              <span
                className={`grid size-7 place-items-center rounded-full text-xs font-semibold ${
                  i === step ? "bg-forest text-white" : i < step ? "bg-forest-soft text-forest" : "bg-sunken text-muted"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              {name}
            </button>
          </li>
        ))}
      </ol>

      <div className="p-5 sm:p-8">
        {step === 0 && (
          <div className="grid gap-8">
            <Intro title="Önce işinize göre ayarlayalım">
              Cevaplarınıza göre yalnızca ihtiyacınız olan parçalar kurulur. Şifre veya erişim anahtarı sormuyoruz; bunları daha sonra yalnızca kendi n8n hesabınıza gireceksiniz.
            </Intro>

            <Group title="İşletmeniz">
              <Field label="İşletme adı" value={config.businessName} onChange={(e) => set("businessName", e.target.value)} error={errors.businessName} placeholder="Örn. Deniz Otel" autoComplete="organization" />
              <div className="grid gap-1.5">
                <span className="text-sm font-medium">Ekibiniz mesajları hangi dilde okusun?</span>
                <div className="flex gap-2">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      aria-pressed={config.language === l.code}
                      onClick={() => set("language", l.code)}
                      className={`h-10 rounded-control px-4 text-sm ring-1 ring-inset transition-colors ${
                        config.language === l.code ? "bg-forest text-white ring-forest" : "bg-surface ring-line-strong hover:bg-sunken"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </Group>

            <Group title="Müşteri mesajları nereden gelsin?" error={errors.channels}>
              <Toggle title="WhatsApp" text="İşletme numaranıza yazılan mesajlar." on={config.whatsapp} onChange={(v) => set("whatsapp", v)} />
              <Toggle title="E-posta" text="Destek e-posta kutunuza gelen mesajlar." on={config.email} onChange={(v) => set("email", v)} />
            </Group>

            <Group title="Mesaj gelince ekibe nasıl haber verilsin?" error={errors.outputs}>
              <Toggle title="E-posta ile bildir" text="Özet, çeviri ve öncelikle birlikte size e-posta gelir. En güvenilir seçenektir." on={config.notifyEmail} onChange={(v) => set("notifyEmail", v)}>
                <Field label="Bildirimin gideceği adres" type="email" value={config.adminEmail} onChange={(e) => set("adminEmail", e.target.value)} error={errors.adminEmail} placeholder="yonetici@firmaniz.com" />
              </Toggle>
              <Toggle title="WhatsApp ile bildir" text="Yöneticinin telefonuna WhatsApp mesajı gider. Meta'nın 24 saat kuralına tabidir (kılavuzda açıklanır)." on={config.notifyWhatsapp} onChange={(v) => set("notifyWhatsapp", v)}>
                <Field label="Yöneticinin telefonu" inputMode="tel" value={config.adminPhone} onChange={(e) => set("adminPhone", e.target.value)} error={errors.adminPhone} placeholder="0532 123 45 67" hint="Başında 0 ya da ülke koduyla yazabilirsiniz." />
              </Toggle>
              <Toggle title="Tabloya kaydet" text="Her mesaj Google Sheets’te bir satır olur. Geçmiş ve raporlama için önerilir." on={config.logSheet} onChange={(v) => set("logSheet", v)}>
                <Field label="Tablo adresi" value={config.sheetId} onChange={(e) => set("sheetId", e.target.value)} error={errors.sheetId} placeholder="https://docs.google.com/spreadsheets/d/…" hint="Tarayıcıdaki adresi olduğu gibi yapıştırın. Tabloyu sonraki adımda hazırlayacaksınız." />
                <Field label="Sayfa (sekme) adı" value={config.sheetTab} onChange={(e) => set("sheetTab", e.target.value)} error={errors.sheetTab} hint="Tablonun altındaki sekmenin adı. Varsayılanı Mesajlar’dır." />
              </Toggle>
            </Group>

            <Group title="Müşteri ne görsün?">
              <Toggle title="Otomatik karşılama yanıtı" text="Müşteri yazdığı anda, kendi dilinde sizin yazdığınız karşılama mesajını alır." on={config.autoReply} onChange={(v) => set("autoReply", v)}>
                <div className="grid gap-1.5">
                  <label htmlFor="reply-text" className="text-sm font-medium">
                    Yanıt metni
                  </label>
                  <textarea
                    id="reply-text"
                    rows={4}
                    maxLength={600}
                    value={config.replyText}
                    onChange={(e) => set("replyText", e.target.value)}
                    aria-invalid={errors.replyText ? true : undefined}
                    className={`${fieldClass} py-3`}
                  />
                  <p className="text-xs text-muted">Türkçe yazın; müşterinin diline otomatik çevrilir. İşletme adınız ve referans numarası sonuna eklenir.</p>
                  {errors.replyText && (
                    <p role="alert" className="text-xs text-danger">
                      {errors.replyText}
                    </p>
                  )}
                </div>
              </Toggle>
            </Group>

            {(needsPhoneNumberId(config) || needsSender(config)) && (
              <Group title="Birkaç teknik bilgi daha">
                {needsPhoneNumberId(config) && (
                  <Field label="WhatsApp Phone number ID" inputMode="numeric" value={config.phoneNumberId} onChange={(e) => set("phoneNumberId", e.target.value)} error={errors.phoneNumberId} placeholder="123456789012345" hint="Meta for Developers > uygulamanız > WhatsApp > API Setup sayfasında yazar. Henüz yoksa Hesaplar adımında nasıl bulunacağını göreceksiniz." />
                )}
                {needsSender(config) && (
                  <Field label="Gönderen e-posta adresi" type="email" value={config.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} error={errors.fromEmail} placeholder="destek@firmaniz.com" hint="Bildirim ve yanıtların kimden gideceği. SMTP hesabınızla aynı adres olmalıdır." />
                )}
              </Group>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-8">
            <Intro title="Hesapları hazırlayın">
              Seçimlerinize göre {integrations.length} hesap gerekiyor. Her adımı yaptıkça kutuyu işaretleyin; ilerlemeniz bu tarayıcıda saklanır, kaldığınız yerden devam edebilirsiniz.
            </Intro>
            {integrations.map((it, i) => (
              <IntegrationCard key={it.id} index={i + 1} item={it} checked={checked} onTick={tick} showHeaders={it.id === "sheets"} />
            ))}
          </div>
        )}

        {step === 2 && <ImportStep config={config} checked={checked} onTick={tick} onDownload={download} />}

        {step === 3 && (
          <div className="grid gap-8">
            <Intro title="Deneyin ve yayına alın">
              Akışı etkinleştirdikten sonra başka bir telefon ya da e-posta adresinden aşağıdaki mesajlardan birini gönderin.
            </Intro>

            <div className="grid gap-3">
              {testMessages.map((t) => (
                <div key={t.text} className="rounded-row bg-sunken/60 p-4 ring-1 ring-line">
                  <p className="font-medium">“{t.text}”</p>
                  <p className="mt-1 text-sm text-muted">{t.expect}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="font-semibold">Birkaç saniye içinde şunları görmelisiniz</h3>
              <ul className="mt-3 grid gap-2 text-muted">
                <li>• Müşteri telefonunda, yazdığı dilde karşılama yanıtı{config.autoReply ? "" : " (otomatik yanıtı kapattığınız için gelmez)"}.</li>
                {config.notifyEmail && <li>• {config.adminEmail || "Yönetici adresinize"}: öncelik etiketli, çeviri ve özet içeren e-posta.</li>}
                {config.notifyWhatsapp && <li>• Yönetici telefonuna WhatsApp bildirimi.</li>}
                {config.logSheet && <li>• Tablonuza yeni bir satır.</li>}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold">Olmadı mı? Sık karşılaşılan durumlar</h3>
              <div className="mt-3 divide-y divide-line border-y border-line">
                {troubleshooting.map((t) => (
                  <details key={t.q} className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
                      {t.q}
                      <span aria-hidden="true" className="text-muted transition-transform duration-200 group-open:rotate-45">+</span>
                    </summary>
                    <p className="pb-4 text-muted">{t.a}</p>
                  </details>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted">Her şey çalışıyorsa akış yayında demektir. İstediğiniz zaman bu sayfaya dönüp seçimlerinizi değiştirebilir ve dosyayı yeniden indirebilirsiniz.</p>
            </div>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-6">
          <Button variant="quiet" onClick={() => go(Math.max(step - 1, 0))} disabled={step === 0}>
            Geri
          </Button>
          {step < 3 ? (
            <Button onClick={next}>{step === 0 ? "Kaydet ve devam et" : "Devam et"}</Button>
          ) : (
            <Button variant="secondary" onClick={() => go(0)}>
              Seçimleri değiştir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Intro({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-prose text-muted">{children}</p>
    </div>
  );
}

function IntegrationCard({
  index,
  item,
  checked,
  onTick,
  showHeaders,
}: {
  index: number;
  item: Integration;
  checked: Record<string, boolean>;
  onTick: (id: string, v: boolean) => void;
  showHeaders: boolean;
}) {
  const done = item.steps.filter((s) => checked[s.id]).length;
  return (
    <section className="rounded-row p-5 ring-1 ring-line">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <h3 className="text-lg font-semibold tracking-tight">
          <span className="mr-2 text-muted">{index}.</span>
          {item.title}
        </h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${done === item.steps.length ? "bg-forest text-white" : "bg-sunken text-muted"}`}
        >
          {done === item.steps.length ? "Tamamlandı" : `${done}/${item.steps.length} adım · ~${item.minutes} dk`}
        </span>
      </div>
      <p className="mt-1 text-muted">{item.why}</p>

      <ol className="mt-5 grid gap-3">
        {item.steps.map((s) => (
          <li key={s.id}>
            <Check checked={Boolean(checked[s.id])} onChange={(v) => onTick(s.id, v)}>
              <RichText text={s.text} />
            </Check>
          </li>
        ))}
      </ol>

      {showHeaders && (
        <div className="mt-5 rounded-control bg-sunken p-4">
          <p className="text-sm font-medium">Tablonun ilk satırına yapıştırılacak başlıklar</p>
          <p className="mt-2 font-mono text-xs break-words text-muted">{sheetHeaders.join("  ·  ")}</p>
          <div className="mt-3">
            <CopyButton value={sheetHeaders.join("\t")} label="Başlıkları kopyala" />
          </div>
        </div>
      )}

      {item.fields && (
        <div className="mt-5">
          <p className="text-sm font-medium">n8n’de doldurmanız gereken alanlar</p>
          <dl className="mt-2 divide-y divide-line rounded-control ring-1 ring-line">
            {item.fields.map(([field, source]) => (
              <div key={field} className="grid gap-0.5 px-4 py-2.5 sm:grid-cols-[1fr_1.4fr] sm:gap-4">
                <dt className="text-sm font-medium">{field}</dt>
                <dd className="text-sm text-muted">{source}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {item.warning && <p className="mt-5 rounded-control bg-pollen/40 px-4 py-3 text-sm">{item.warning}</p>}
    </section>
  );
}

function ImportStep({
  config,
  checked,
  onTick,
  onDownload,
}: {
  config: SupportConfig;
  checked: Record<string, boolean>;
  onTick: (id: string, v: boolean) => void;
  onDownload: () => void;
}) {
  const errors = validateConfig(config);
  const ready = Object.keys(errors).length === 0;
  const slots = ready ? credentialSlots(buildWorkflow(config)) : [];

  return (
    <div className="grid gap-8">
      <Intro title="İş akışını n8n’e yükleyin">
        Dosya, verdiğiniz bilgilerle önceden doldurulmuş olarak hazırlanır. İçinde şifre ya da anahtar bulunmaz.
      </Intro>

      {ready ? (
        <div className="flex flex-wrap items-center gap-4 rounded-row bg-forest-soft/50 p-5 ring-1 ring-forest">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{config.businessName} için hazır</p>
            <p className="text-sm text-muted">{workflowFileName}</p>
          </div>
          <Button size="lg" onClick={onDownload}>
            İş akışı dosyasını indir
          </Button>
        </div>
      ) : (
        <p role="alert" className="rounded-row bg-danger-soft px-5 py-4 text-sm text-danger">
          Dosyayı indirmeden önce “Seçimleriniz” adımındaki eksik bilgileri tamamlayın.
        </p>
      )}

      <ol className="grid gap-4">
        {importSteps.map((s) => (
          <li key={s.id}>
            <Check checked={Boolean(checked[s.id])} onChange={(v) => onTick(s.id, v)}>
              <RichText text={s.text} />
            </Check>
          </li>
        ))}
      </ol>

      {slots.length > 0 && (
        <div>
          <h3 className="font-semibold">Hangi kutuya hangi hesabı seçeceksiniz?</h3>
          <p className="mt-1 text-sm text-muted">İçe aktarınca bu kutular uyarı gösterir. Her birini açıp ilgili kimlik bilgisini seçin.</p>
          <dl className="mt-3 divide-y divide-line rounded-control ring-1 ring-line">
            {slots.map((s) => (
              <div key={s.node} className="grid gap-0.5 px-4 py-2.5 sm:grid-cols-[1.2fr_1fr] sm:gap-4">
                <dt className="text-sm font-medium">{s.node}</dt>
                <dd className="text-sm text-muted">{s.credential}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
