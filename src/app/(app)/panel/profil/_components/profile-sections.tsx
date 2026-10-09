"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { StepFields, type FieldErrors, type FieldStage } from "@/components/profile/step-fields";
import { draftFrom, type Draft } from "@/modules/profile/draft";
import { channels, companySizes, labelOf, sectors, services, signals, workTypes } from "@/modules/profile/options";
import { stepSchemas } from "@/modules/profile/schema";
import { saveProfileSection } from "../actions";

function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted">Belirtilmedi</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((label) => (
        <li key={label} className="rounded-full bg-sunken px-3 py-1 text-sm">
          {label}
        </li>
      ))}
    </ul>
  );
}

function Field({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted">{title}</p>
      {children}
    </div>
  );
}

type SectionDef = {
  id: FieldStage;
  title: string;
  description: string;
  view: (d: Draft) => ReactNode;
};

const sections: SectionDef[] = [
  {
    id: "about",
    title: "İşletme",
    description: "Adınız, çalışma biçiminiz ve kısa anlatımınız.",
    view: (d) => (
      <>
        <div>
          <p className="text-lg font-semibold tracking-tight">{d.businessName}</p>
          <p className="text-muted">{labelOf(workTypes, d.workType)}</p>
        </div>
        {d.businessDescription && <p className="max-w-prose text-pretty">{d.businessDescription}</p>}
      </>
    ),
  },
  {
    id: "target",
    title: "Hizmet ve hedef müşteri",
    description: "Ne sattığınız ve kime sattığınız.",
    view: (d) => (
      <>
        <Field title="Sattığınız hizmetler">
          <Chips items={d.services.map((s) => labelOf(services, s))} />
        </Field>
        <Field title="Hizmet verdiğiniz sektörler">
          <Chips items={d.targetSectors.map((s) => labelOf(sectors, s))} />
        </Field>
        <Field title="Hedef firma büyüklüğü">
          <Chips items={d.targetSizes.map((s) => labelOf(companySizes, s))} />
        </Field>
      </>
    ),
  },
  {
    id: "reach",
    title: "Bölge ve iletişim",
    description: "Nerede müşteri aradığınız ve onlara nasıl ulaştığınız.",
    view: (d) => (
      <>
        <Field title="Bölge">
          <Chips items={d.cityScope === "turkey" ? ["Türkiye genelinde"] : d.targetCities} />
        </Field>
        <Field title="İletişim kanalları">
          <Chips items={d.channels.map((c) => labelOf(channels, c))} />
        </Field>
      </>
    ),
  },
  {
    id: "fit",
    title: "İyi aday işaretleri",
    description: "Adspine AI'nın mesajlarınızı ve önerilerinizi hazırlarken kullandığı ipuçları.",
    view: (d) => (
      <>
        <Chips items={d.signals.map((s) => labelOf(signals, s))} />
        {d.signalNotes && <p className="max-w-prose text-pretty text-muted">&ldquo;{d.signalNotes}&rdquo;</p>}
      </>
    ),
  },
];

function SectionCard({ def, profile }: { def: SectionDef; profile: Draft }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  // Kaydedilen değerler, sunucudan yenisi gelene kadar anında gösterilir (eski değerler bir an görünmesin).
  // Sunucu yeni veri gönderince `profile` nesnesi değişir ve bu kayıt kendiliğinden devre dışı kalır.
  const [justSaved, setJustSaved] = useState<{ base: Draft; value: Draft } | null>(null);
  const shown = justSaved && justSaved.base === profile ? justSaved.value : profile;

  // Kaydedildi bildirimi birkaç saniye sonra kaybolur.
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 3500);
    return () => clearTimeout(t);
  }, [saved]);

  return (
    <section
      aria-labelledby={`profile-${def.id}`}
      className="rounded-panel bg-surface p-6 ring-1 ring-line transition-shadow duration-300 data-[editing=true]:shadow-float sm:p-8"
      data-editing={editing}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={`profile-${def.id}`} className="text-lg font-semibold tracking-tight">
            {def.title}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{def.description}</p>
        </div>
        {!editing && (
          <div className="flex shrink-0 items-center gap-3">
            {saved && (
              <span role="status" className="text-sm font-medium text-accent">
                Kaydedildi
              </span>
            )}
            <Button variant="secondary" onClick={() => setEditing(true)} aria-label={`${def.title} bölümünü düzenle`}>
              Düzenle
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <SectionEditor
          def={def}
          profile={shown}
          onCancel={() => setEditing(false)}
          onSaved={(value) => {
            setJustSaved({ base: profile, value });
            setEditing(false);
            setSaved(true);
            router.refresh();
          }}
        />
      ) : (
        <div className="mt-6 grid gap-5">{def.view(shown)}</div>
      )}
    </section>
  );
}

/** Düzenleme formu: her açılışta güncel profilden yeni bir taslakla başlar. */
function SectionEditor({
  def,
  profile,
  onCancel,
  onSaved,
}: {
  def: SectionDef;
  profile: Draft;
  onCancel: () => void;
  onSaved: (saved: Draft) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(profile));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const check = stepSchemas[def.id].safeParse(draft);
    if (!check.success) {
      const next: FieldErrors = {};
      for (const issue of check.error.issues) next[issue.path[0] as keyof Draft] ??= issue.message;
      setErrors(next);
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveProfileSection(def.id, draft);
        if (result.ok) return onSaved(draft);
        setError(result.error);
        if (result.fields) setErrors(result.fields as FieldErrors);
      } catch {
        setError("Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.");
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="mt-7 grid gap-8">
      <StepFields stage={def.id} draft={draft} update={update} errors={errors} />
      {error && (
        <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="quiet" size="lg" onClick={onCancel} disabled={pending}>
          Vazgeç
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}

export function ProfileSections({ profile }: { profile: Draft }) {
  return (
    <div className="grid gap-5">
      {sections.map((def) => (
        <SectionCard key={def.id} def={def} profile={profile} />
      ))}
    </div>
  );
}
