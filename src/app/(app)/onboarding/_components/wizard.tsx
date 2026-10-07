"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { companySizes, dealValues, sectors, services, workTypes } from "@/modules/profile/options";
import { stepSchemas } from "@/modules/profile/schema";
import { completeOnboarding } from "../actions";
import { ChipGroup, RadioCards } from "./choice-controls";
import { CityPicker } from "./city-picker";

type Draft = {
  businessName: string;
  workType: string;
  services: string[];
  targetSectors: string[];
  targetCities: string[];
  targetSize: string;
  dealValue: string;
};

type Errors = Partial<Record<keyof Draft, string>>;

const steps = [
  {
    key: "about",
    title: "Önce sizi tanıyalım",
    text: "Hesabınızı bu bilgilere göre hazırlayacağız.",
  },
  {
    key: "offer",
    title: "Ne satıyorsunuz?",
    text: "Firmaları, bu hizmetlere ne kadar ihtiyaç duyduklarına göre puanlayacağız.",
  },
  {
    key: "audience",
    title: "Kime satıyorsunuz?",
    text: "Aramalarınız bu sektör ve şehirlere göre şekillenecek.",
  },
  {
    key: "deal",
    title: "Bir projeden ortalama ne kazanırsınız?",
    text: "Hangi firmaların bütçe açısından uygun olduğunu tahmin etmemize yardımcı olur.",
  },
] as const;

export function Wizard({ defaultName }: { defaultName: string }) {
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    businessName: defaultName,
    workType: "",
    services: [],
    targetSectors: [],
    targetCities: [],
    targetSize: "",
    dealValue: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function goTo(next: number) {
    setIndex(next);
    setSaveError(null);
    // Ekran okuyucu ve klavye kullanıcısı yeni adımın başına taşınır.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function validate() {
    const result = stepSchemas[step.key].safeParse(draft);
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
    if (!validate()) return;
    if (!isLast) return goTo(index + 1);

    startTransition(async () => {
      const result = await completeOnboarding(draft);
      if (result?.error) setSaveError(result.error); // başarıda sunucu /panel'e yönlendirir
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="mb-10 flex gap-1.5" role="img" aria-label={`${steps.length} adımın ${index + 1}. adımı`}>
        {steps.map((s, i) => (
          <span
            key={s.key}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= index ? "bg-forest" : "bg-line"}`}
          />
        ))}
      </div>

      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none sm:text-3xl">
        {step.title}
      </h1>
      <p className="mt-3 mb-8 text-muted">{step.text}</p>

      <div key={step.key} className="grid gap-7">
        {step.key === "about" && (
          <>
            <Field
              label="İşletme ya da marka adı"
              value={draft.businessName}
              onChange={(e) => update("businessName", e.target.value)}
              error={errors.businessName}
              autoComplete="organization"
              maxLength={80}
            />
            <RadioCards
              legend="Nasıl çalışıyorsunuz?"
              name="workType"
              options={workTypes}
              value={draft.workType}
              onChange={(v) => update("workType", v)}
              error={errors.workType}
            />
          </>
        )}

        {step.key === "offer" && (
          <ChipGroup
            legend="Sattığınız hizmetler"
            options={services}
            value={draft.services}
            onChange={(v) => update("services", v)}
            error={errors.services}
          />
        )}

        {step.key === "audience" && (
          <>
            <ChipGroup
              legend="Hangi sektörlere hizmet veriyorsunuz?"
              options={sectors}
              value={draft.targetSectors}
              onChange={(v) => update("targetSectors", v)}
              error={errors.targetSectors}
            />
            <CityPicker value={draft.targetCities} onChange={(v) => update("targetCities", v)} error={errors.targetCities} />
            <RadioCards
              legend="Hedef firma büyüklüğü"
              name="targetSize"
              options={companySizes}
              value={draft.targetSize}
              onChange={(v) => update("targetSize", v)}
              error={errors.targetSize}
              columns={2}
            />
          </>
        )}

        {step.key === "deal" && (
          <RadioCards
            legend="Ortalama proje bedeli"
            name="dealValue"
            options={dealValues}
            value={draft.dealValue}
            onChange={(v) => update("dealValue", v)}
            error={errors.dealValue}
            columns={2}
          />
        )}
      </div>

      {saveError && (
        <p role="alert" className="mt-6 rounded-control bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {saveError}
        </p>
      )}

      <div className="mt-10 flex items-center justify-between gap-3">
        {index > 0 ? (
          <Button variant="quiet" size="lg" onClick={() => goTo(index - 1)} disabled={pending}>
            Geri
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" size="lg" disabled={pending}>
          {isLast ? (pending ? "Kaydediliyor…" : "Bitir ve panele geç") : "Devam"}
        </Button>
      </div>
    </form>
  );
}
