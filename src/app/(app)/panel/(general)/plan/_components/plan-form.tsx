"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ComboField } from "@/components/ui/combo-field";
import { DownloadIcon, PenIcon, TrashIcon } from "@/components/ui/icons";
import { TextArea } from "@/components/ui/text-fields";
import { fromLocalInputs, googleCalendarUrl, overlaps, toIcs } from "@/modules/plan/calendar";
import { planKinds, type PlanItem } from "@/modules/plan/types";
import { draftErrors, draftToPayload, type Favorite, type FormDraft } from "./plan-ui";

const inputClass =
  "h-11 w-full min-w-0 rounded-control bg-surface px-3.5 ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest aria-invalid:ring-danger";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {children}
      {error && (
        <span role="alert" className="text-sm font-normal text-danger">
          {error}
        </span>
      )}
    </label>
  );
}

function downloadIcs(item: PlanItem) {
  const blob = new Blob([toIcs(item)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${item.title.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40) || "plan"}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Plan formu (yeni ya da düzenleme). Kişi alanı, takipteki firmalardan seçilebilir ya da serbest yazılabilir.
 * Doğrulama yazarken yapılır; kayıt düğmesi hatalıyken pasiftir.
 */
export function PlanForm({
  draft,
  onChange,
  item,
  favorites,
  others,
  saving,
  onSave,
  onCancel,
  onDelete,
}: {
  draft: FormDraft;
  onChange: (next: FormDraft) => void;
  /** Düzenlenen öğe (yeni planda null). */
  item: PlanItem | null;
  favorites: Favorite[];
  /** Çakışma uyarısı için o günün diğer planları. */
  others: PlanItem[];
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof FormDraft>(key: K, value: FormDraft[K]) => onChange({ ...draft, [key]: value });
  const errors = draftErrors(draft);
  const invalid = Object.keys(errors).length > 0;

  const options = favorites.map((f) => ({ value: f.id, label: f.name, hint: [f.category, f.district].filter(Boolean).join(" · ") || undefined }));
  const firm = favorites.find((f) => f.id === draft.person[0]);

  const clashes =
    draft.date && !draft.allDay && draft.kind !== "not"
      ? overlaps(
          { startsAt: fromLocalInputs(draft.date, draft.start || "00:00"), endsAt: draft.end && draft.end > draft.start ? fromLocalInputs(draft.date, draft.end) : null },
          others,
          item?.id,
        )
      : [];

  // Kaydedilmiş öğenin dışa aktarma bağlantıları, formdaki güncel değerlerle üretilir.
  const preview = !invalid ? { ...draftToPayload(draft, favorites), id: item?.id ?? "yeni" } : null;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!invalid && !saving) onSave();
      }}
      className="grid gap-4"
    >
      <h3 className="text-lg font-semibold tracking-tight">{item ? "Planı düzenle" : "Yeni plan"}</h3>

      <div role="group" aria-label="Tür" className="flex flex-wrap gap-1.5">
        {planKinds.map((k) => (
          <button
            key={k.value}
            type="button"
            aria-pressed={draft.kind === k.value}
            onClick={() => onChange({ ...draft, kind: k.value, allDay: k.value === "not" ? true : draft.allDay })}
            className="h-9 rounded-full px-3.5 text-sm ring-1 ring-line-strong ring-inset transition-colors hover:bg-sunken aria-pressed:bg-forest aria-pressed:text-white aria-pressed:ring-forest"
          >
            {k.label}
          </button>
        ))}
      </div>

      <Field label="Başlık" error={touched || draft.title ? errors.title : undefined}>
        <input
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={120}
          placeholder={draft.kind === "arama" ? "Örn. Teklif için ara" : draft.kind === "gorev" ? "Örn. Teklif dosyasını hazırla" : "Örn. Moda Kafe ile görüşme"}
          aria-invalid={(touched || draft.title !== "") && errors.title ? true : undefined}
          autoFocus
          className={inputClass}
        />
      </Field>

      <ComboField
        legend="Kişi ya da firma"
        options={options}
        value={draft.person}
        onChange={(v) => set("person", v)}
        single
        allowCustom
        placeholder="Takipteki firmayı seçin ya da isim yazın"
      />
      {firm && (
        <Link href={`/panel/calis?firma=${firm.id}`} className="-mt-2 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-accent underline underline-offset-4 hover:no-underline">
          <PenIcon size={14} />
          Bu firmaya mesaj hazırla
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tarih" error={errors.date}>
          <input type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} aria-invalid={errors.date ? true : undefined} className={inputClass} />
        </Field>
        <label className="flex items-center gap-2.5 self-end pb-3 text-sm">
          <input
            type="checkbox"
            checked={draft.allDay}
            onChange={(e) => set("allDay", e.target.checked)}
            className="size-4 rounded accent-[var(--color-forest)]"
          />
          Tüm gün
        </label>
      </div>

      {!draft.allDay && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Başlangıç">
            <input type="time" value={draft.start} onChange={(e) => set("start", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Bitiş (isteğe bağlı)" error={errors.end}>
            <input type="time" value={draft.end} onChange={(e) => set("end", e.target.value)} aria-invalid={errors.end ? true : undefined} className={inputClass} />
          </Field>
        </div>
      )}
      {clashes.length > 0 && (
        <p role="status" className="-mt-2 rounded-control bg-pollen/50 px-3 py-2 text-sm">
          Bu saatte başka bir planınız var: {clashes[0].title}
          {clashes.length > 1 ? ` (+${clashes.length - 1})` : ""}
        </p>
      )}

      <Field label="Yer ya da bağlantı (isteğe bağlı)">
        <input value={draft.location} onChange={(e) => set("location", e.target.value)} maxLength={160} placeholder="Adres, ofis ya da toplantı bağlantısı" className={inputClass} />
      </Field>

      <TextArea label="Notlar" value={draft.details} onChange={(e) => set("details", e.target.value)} maxLength={1000} placeholder="Konuşulacaklar, hazırlanacaklar…" />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={saving || (touched && invalid)}>
          {saving ? "Kaydediliyor…" : item ? "Kaydet" : "Takvime ekle"}
        </Button>
        <Button variant="quiet" onClick={onCancel} disabled={saving}>
          Vazgeç
        </Button>
        {item && onDelete && (
          <Button variant="quiet" onClick={onDelete} disabled={saving} className="ml-auto text-danger">
            <TrashIcon size={16} />
            Sil
          </Button>
        )}
      </div>

      {item && preview && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <span className="text-sm text-muted">Takvime aktar:</span>
          <a
            href={googleCalendarUrl(preview)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-full px-3.5 text-sm font-medium ring-1 ring-line-strong ring-inset transition-colors hover:bg-forest-soft hover:text-accent"
          >
            Google Takvim
          </a>
          <button
            type="button"
            onClick={() => downloadIcs({ ...item, ...preview, details: preview.details })}
            className="inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium ring-1 ring-line-strong ring-inset transition-colors hover:bg-forest-soft hover:text-accent"
          >
            <DownloadIcon size={16} />
            .ics indir
          </button>
        </div>
      )}
    </form>
  );
}
