"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";
import {
  channels,
  cityScopes,
  companySizes,
  dealValues,
  labelOf,
  sectors,
  services,
  signals,
  workTypes,
} from "@/modules/profile/options";
import { stepSchemas } from "@/modules/profile/schema";
import { completeOnboarding } from "../actions";
import { CardGroup, ChipGroup } from "./choice-controls";
import { CityPicker } from "./city-picker";
import { LiveProfile, type Draft } from "./live-profile";
import styles from "./wizard.module.css";

type Errors = Partial<Record<keyof Draft, string>>;

const stages = ["intro", "about", "offer", "audience", "where", "signals", "reach", "review"] as const;
type Stage = (typeof stages)[number];

const copy: Record<Exclude<Stage, "intro">, { title: string; text: string }> = {
  about: { title: "Sizi tanıyarak başlayalım", text: "Hesabınızı bu bilgilere göre hazırlayacağız." },
  offer: { title: "Ne satıyorsunuz?", text: "Firmaları, bu hizmetlere ne kadar ihtiyaç duyduklarına göre puanlayacağız." },
  audience: { title: "Kime satıyorsunuz?", text: "Aramalarınız bu sektörlere ve firma büyüklüğüne göre şekillenecek." },
  where: { title: "Nerede müşteri arıyorsunuz?", text: "Aramalarda bu bölgeler varsayılan olarak seçili gelecek." },
  signals: {
    title: "İyi bir aday, hangi işaretlerle anlaşılır?",
    text: "Bu seçimler, hangi firmaların öne çıkacağını belirler. Birden fazlasını seçebilirsiniz.",
  },
  reach: { title: "Müşterilerle nasıl iletişim kuruyorsunuz?", text: "İletişim bilgisi bulunan firmaları buna göre değerlendireceğiz." },
  review: { title: "Her şey doğru mu?", text: "Bunları panelden istediğiniz zaman değiştirebileceksiniz." },
};

const empty: Draft = {
  businessName: "",
  workType: "",
  services: [],
  primaryService: "",
  targetSectors: [],
  targetSize: "",
  cityScope: "",
  targetCities: [],
  signals: [],
  channels: [],
  dealValue: "",
};

function BigInput({
  label,
  error,
  ...props
}: { label: string; error?: string } & Omit<React.ComponentProps<"input">, "className">) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-base font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-14 rounded-row bg-surface px-4 text-lg ring-1 ring-line-strong ring-inset transition-shadow outline-none placeholder:text-muted focus:ring-2 focus:ring-forest aria-invalid:ring-danger"
        {...props}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Soru açıkken yumuşakça açılan, kapalıyken etkisizleşen alan. */
function Reveal({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className={styles.reveal} data-open={open}>
      <div inert={!open}>{children}</div>
    </div>
  );
}

function SummaryRow({ title, value, onEdit }: { title: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-4">
      <div className="min-w-0">
        <p className="text-sm text-muted">{title}</p>
        <p className="mt-0.5 font-medium">{value || "—"}</p>
      </div>
      <Button variant="quiet" onClick={onEdit} aria-label={`${title} bilgisini düzenle`}>
        Düzenle
      </Button>
    </div>
  );
}

export function Wizard({ defaultName, initial }: { defaultName: string; initial: Partial<Draft> }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [draft, setDraft] = useState<Draft>(() => ({
    ...empty,
    ...initial,
    businessName: initial.businessName ?? defaultName,
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const index = stages.indexOf(stage);
  const firstName = defaultName.split(" ")[0];

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function setServices(next: string[]) {
    setDraft((d) => ({
      ...d,
      services: next,
      // Tek hizmet varsa en güçlü olan odur; seçimden çıkan hizmet "en güçlü" kalamaz.
      primaryService: next.length === 1 ? next[0] : next.includes(d.primaryService) ? d.primaryService : "",
    }));
    setErrors((e) => ({ ...e, services: undefined, primaryService: undefined }));
  }

  function goTo(next: Stage) {
    setDirection(stages.indexOf(next) >= index ? "forward" : "back");
    setStage(next);
    setSaveError(null);
  }

  // Yeni adıma geçildiğinde başlığa odaklan: klavye ve ekran okuyucu kullanıcıları için.
  useEffect(() => {
    if (stage !== "intro") headingRef.current?.focus({ preventScroll: true });
  }, [stage]);

  function validate(): boolean {
    if (stage === "intro" || stage === "review") return true;
    const result = stepSchemas[stage].safeParse(draft);
    if (result.success) return true;
    const next: Errors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof Draft;
      next[field] ??= issue.message;
    }
    setErrors(next);
    return false;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (stage === "intro") return goTo("about");
    if (!validate()) return;
    if (stage !== "review") return goTo(stages[index + 1]);

    startTransition(async () => {
      const result = await completeOnboarding(draft);
      if (!result.ok) return setSaveError(result.error);
      setDone(true);
      setTimeout(() => router.replace("/panel"), 1800);
    });
  }

  const animation = direction === "forward" ? styles.forward : styles.back;
  const progress = index / (stages.length - 1);

  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-16 xl:px-24">
        <header className="flex items-center justify-between">
          <Wordmark />
          {stage !== "intro" && !done && (
            <p className="text-sm text-muted" aria-live="polite">
              Adım {index} / {stages.length - 1}
            </p>
          )}
        </header>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div className={`${styles.progress} h-full w-full rounded-full bg-forest`} style={{ transform: `scaleX(${done ? 1 : progress})` }} />
        </div>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col justify-center py-10" noValidate>
          <div className="mx-auto w-full max-w-[34rem]">
            {done ? (
              <div className={`${styles.forward} grid justify-items-start gap-5`} role="status">
                <span className={`${styles.ring} grid size-16 place-items-center rounded-full bg-forest`}>
                  <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
                    <path className={styles.check} d="m5.5 12.5 4.2 4.2 8.8-9.4" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <h1 className="text-3xl font-semibold tracking-display sm:text-4xl">Hesabınız hazır</h1>
                <p className="text-lg text-muted">Panele yönlendiriyoruz. İlk müşteri listenizi oluşturmaya hazırsınız.</p>
                <Button size="lg" onClick={() => router.replace("/panel")}>
                  Panele geç
                </Button>
              </div>
            ) : stage === "intro" ? (
              <div className={`${styles.stagger} grid justify-items-start gap-6`}>
                <h1 style={{ "--i": 0 } as React.CSSProperties} className="text-display font-semibold tracking-display">
                  {firstName ? `Hoş geldiniz, ${firstName}.` : "Hoş geldiniz."}
                </h1>
                <p style={{ "--i": 1 } as React.CSSProperties} className="max-w-[30rem] text-lg text-muted">
                  Sinyal&apos;i size göre kuralım. Birkaç kısa soruyla kime, neyi sattığınızı öğreneceğiz; ilk listeniz
                  buna göre puanlanacak. Yaklaşık iki dakika sürer.
                </p>
                <div style={{ "--i": 2 } as React.CSSProperties}>
                  <Button type="submit" size="lg">
                    Başlayalım
                  </Button>
                </div>
              </div>
            ) : (
              <div key={stage} className={animation}>
                <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold tracking-display outline-none sm:text-4xl">
                  {copy[stage].title}
                </h1>
                <p className="mt-4 mb-9 text-lg text-muted">{copy[stage].text}</p>

                <div className="grid gap-8">
                  {stage === "about" && (
                    <>
                      <BigInput
                        label="İşletme ya da marka adınız"
                        value={draft.businessName}
                        onChange={(e) => update("businessName", e.target.value)}
                        error={errors.businessName}
                        autoComplete="organization"
                        maxLength={80}
                      />
                      <CardGroup
                        legend="Nasıl çalışıyorsunuz?"
                        name="workType"
                        options={workTypes}
                        value={draft.workType ? [draft.workType] : []}
                        onChange={([v]) => update("workType", v)}
                        error={errors.workType}
                      />
                    </>
                  )}

                  {stage === "offer" && (
                    <>
                      <CardGroup
                        name="services"
                        options={services}
                        value={draft.services}
                        onChange={setServices}
                        multiple
                        columns={2}
                        error={errors.services}
                      />
                      <Reveal open={draft.services.length > 1}>
                        <CardGroup
                          legend="En çok hangisinde güçlüsünüz?"
                          name="primaryService"
                          options={services.filter((s) => draft.services.includes(s.value))}
                          value={draft.primaryService ? [draft.primaryService] : []}
                          onChange={([v]) => update("primaryService", v)}
                          columns={2}
                          error={errors.primaryService}
                        />
                      </Reveal>
                    </>
                  )}

                  {stage === "audience" && (
                    <>
                      <ChipGroup
                        legend="Hangi sektörlere hizmet veriyorsunuz?"
                        options={sectors}
                        value={draft.targetSectors}
                        onChange={(v) => update("targetSectors", v)}
                        error={errors.targetSectors}
                      />
                      <CardGroup
                        legend="Hedef firma büyüklüğü"
                        name="targetSize"
                        options={companySizes}
                        value={draft.targetSize ? [draft.targetSize] : []}
                        onChange={([v]) => update("targetSize", v)}
                        columns={2}
                        error={errors.targetSize}
                      />
                    </>
                  )}

                  {stage === "where" && (
                    <>
                      <CardGroup
                        name="cityScope"
                        options={cityScopes}
                        value={draft.cityScope ? [draft.cityScope] : []}
                        onChange={([v]) => update("cityScope", v)}
                        error={errors.cityScope}
                      />
                      <Reveal open={draft.cityScope === "cities"}>
                        <CityPicker value={draft.targetCities} onChange={(v) => update("targetCities", v)} error={errors.targetCities} />
                      </Reveal>
                    </>
                  )}

                  {stage === "signals" && (
                    <CardGroup
                      name="signals"
                      options={signals}
                      value={draft.signals}
                      onChange={(v) => update("signals", v)}
                      multiple
                      error={errors.signals}
                    />
                  )}

                  {stage === "reach" && (
                    <>
                      <ChipGroup
                        legend="Hangi kanalları kullanıyorsunuz?"
                        options={channels}
                        value={draft.channels}
                        onChange={(v) => update("channels", v)}
                        error={errors.channels}
                      />
                      <CardGroup
                        legend="Bir projeden ortalama ne kazanırsınız?"
                        name="dealValue"
                        options={dealValues}
                        value={draft.dealValue ? [draft.dealValue] : []}
                        onChange={([v]) => update("dealValue", v)}
                        columns={2}
                        error={errors.dealValue}
                      />
                    </>
                  )}

                  {stage === "review" && (
                    <div className="-mt-2">
                      <SummaryRow title="İşletme" value={`${draft.businessName}, ${labelOf(workTypes, draft.workType).toLocaleLowerCase("tr")}`} onEdit={() => goTo("about")} />
                      <SummaryRow
                        title="Hizmetler"
                        value={draft.services.map((s) => (s === draft.primaryService && draft.services.length > 1 ? `${labelOf(services, s)} (en güçlü)` : labelOf(services, s))).join(", ")}
                        onEdit={() => goTo("offer")}
                      />
                      <SummaryRow
                        title="Hedef müşteri"
                        value={`${draft.targetSectors.map((s) => labelOf(sectors, s)).join(", ")} · ${labelOf(companySizes, draft.targetSize)}`}
                        onEdit={() => goTo("audience")}
                      />
                      <SummaryRow
                        title="Bölge"
                        value={draft.cityScope === "turkey" ? "Türkiye geneli" : draft.targetCities.join(", ")}
                        onEdit={() => goTo("where")}
                      />
                      <SummaryRow title="İyi aday işaretleri" value={draft.signals.map((s) => labelOf(signals, s)).join(", ")} onEdit={() => goTo("signals")} />
                      <SummaryRow
                        title="İletişim ve proje bedeli"
                        value={`${draft.channels.map((c) => labelOf(channels, c)).join(", ")} · ${labelOf(dealValues, draft.dealValue)}`}
                        onEdit={() => goTo("reach")}
                      />
                    </div>
                  )}
                </div>

                {saveError && (
                  <p role="alert" className="mt-6 rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">
                    {saveError}
                  </p>
                )}

                <div className="mt-10 flex items-center justify-between gap-3">
                  <Button variant="quiet" size="lg" onClick={() => goTo(stages[index - 1])} disabled={pending}>
                    Geri
                  </Button>
                  <Button type="submit" size="lg" disabled={pending}>
                    {stage === "review" ? (pending ? "Hesabınız hazırlanıyor…" : "Hesabımı hazırla") : "Devam"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      <aside className="hidden p-4 lg:block" aria-label="Hedef profil önizlemesi">
        <div className="sticky top-4 flex h-[calc(100dvh-2rem)] items-center justify-center overflow-y-auto rounded-panel bg-forest p-10">
          <LiveProfile draft={draft} />
        </div>
      </aside>
    </div>
  );
}
