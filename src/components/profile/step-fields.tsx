"use client";

import { BigInput, TextArea } from "@/components/ui/text-fields";
import { ComboField } from "@/components/ui/combo-field";
import { Reveal } from "@/components/ui/reveal";
import { titleCase } from "@/lib/text";
import { provinces } from "@/modules/profile/cities";
import type { Draft } from "@/modules/profile/draft";
import {
  channels,
  cityScopes,
  companySizes,
  dealValues,
  sectors,
  services,
  signals,
  workTypes,
} from "@/modules/profile/options";

export type FieldStage = "about" | "target" | "reach" | "fit";
export type FieldErrors = Partial<Record<keyof Draft, string>>;

const sizeOptions = companySizes.map((s) => ({ value: s.value, label: s.label }));
const cityOptions = provinces.map((c) => ({ value: c, label: c }));

/**
 * Hedef profilin form alanları. Hem ilk kurulumda (onboarding) hem de profil sayfasındaki
 * bölüm düzenlemede aynı bileşen kullanılır; böylece iki yerde aynı kurallar ve görünüm geçerli olur.
 */
export function StepFields({
  stage,
  draft,
  update,
  errors,
}: {
  stage: FieldStage;
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  errors: FieldErrors;
}) {
  if (stage === "about") {
    return (
      <>
        <BigInput
          label="İşletme ya da marka adınız"
          value={draft.businessName}
          onChange={(e) => update("businessName", e.target.value)}
          error={errors.businessName}
          autoComplete="organization"
          maxLength={80}
        />
        <ComboField
          legend="Nasıl çalışıyorsunuz?"
          options={workTypes}
          value={draft.workType ? [draft.workType] : []}
          onChange={([v]) => update("workType", v ?? "")}
          single
          allowCustom
          placeholder="Seçin ya da kendi ifadenizi yazın"
          error={errors.workType}
        />
        <TextArea
          label="Ne yaptığınızı kısaca anlatın"
          hint="İsteğe bağlı. Satış mesajlarını sizin dilinizle yazabilmemiz için kullanılır."
          value={draft.businessDescription}
          onChange={(e) => update("businessDescription", e.target.value)}
          maxLength={500}
          error={errors.businessDescription}
        />
      </>
    );
  }

  if (stage === "target") {
    return (
      <>
        <ComboField
          legend="Sattığınız hizmetler"
          options={services}
          value={draft.services}
          onChange={(v) => update("services", v)}
          allowCustom
          placeholder="Hizmet seçin ya da yazın"
          error={errors.services}
        />
        <ComboField
          legend="Hizmet verdiğiniz sektörler"
          options={sectors}
          value={draft.targetSectors}
          onChange={(v) => update("targetSectors", v)}
          allowCustom
          placeholder="Sektör seçin ya da yazın"
          error={errors.targetSectors}
        />
        <ComboField
          legend="Hedef firma büyüklüğü"
          options={sizeOptions}
          value={draft.targetSize ? [draft.targetSize] : []}
          onChange={([v]) => update("targetSize", v ?? "")}
          single
          placeholder="Seçin"
          error={errors.targetSize}
        />
      </>
    );
  }

  if (stage === "reach") {
    return (
      <>
        {/* Şehir alanı bölge sorusunun altında açılır; kapalıyken araya boşluk girmez. */}
        <div>
          <ComboField
            legend="Hangi bölgede müşteri arıyorsunuz?"
            options={cityScopes}
            value={draft.cityScope ? [draft.cityScope] : []}
            onChange={([v]) => update("cityScope", v ?? "")}
            single
            placeholder="Seçin"
            error={errors.cityScope}
          />
          <Reveal open={draft.cityScope === "cities"}>
            <ComboField
              legend="Şehirler"
              options={cityOptions}
              value={draft.targetCities}
              onChange={(v) => update("targetCities", v)}
              allowCustom
              normalize={titleCase}
              placeholder="İl seçin ya da ilçe yazın"
              error={errors.targetCities}
            />
          </Reveal>
        </div>
        <ComboField
          legend="Müşterilere hangi kanallardan ulaşıyorsunuz?"
          options={channels}
          value={draft.channels}
          onChange={(v) => update("channels", v)}
          allowCustom
          max={8}
          placeholder="Kanal seçin ya da yazın"
          error={errors.channels}
        />
        <ComboField
          legend="Bir projeden ortalama ne kazanırsınız?"
          options={dealValues}
          value={draft.dealValue ? [draft.dealValue] : []}
          onChange={([v]) => update("dealValue", v ?? "")}
          single
          placeholder="Seçin"
          error={errors.dealValue}
        />
      </>
    );
  }

  return (
    <>
      <ComboField
        legend="Hangi işaretler, bir firmanın sizin için iyi aday olduğunu gösterir?"
        options={signals}
        value={draft.signals}
        onChange={(v) => update("signals", v)}
        allowCustom
        max={8}
        placeholder="İşaret seçin ya da kendiniz yazın"
        error={errors.signals}
      />
      <TextArea
        label="Eklemek istedikleriniz"
        hint="İsteğe bağlı. İdeal müşterinizi kendi cümlelerinizle anlatın."
        value={draft.signalNotes}
        onChange={(e) => update("signalNotes", e.target.value)}
        maxLength={500}
        error={errors.signalNotes}
      />
    </>
  );
}
