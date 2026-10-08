"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "@/components/ui/icons";
import { cleanEmail, isPlausibleEmail } from "@/modules/outreach/discover/emails";
import type { Contact } from "@/modules/outreach/schema";
import { KindChip, StatusChip } from "./contact-ui";

export type ContactDraft = { name: string; company: string; email: string; phone: string; website: string; city: string };

export const blankContact: ContactDraft = { name: "", company: "", email: "", phone: "", website: "", city: "" };

export const draftOf = (c: Contact): ContactDraft => ({
  name: c.name ?? "",
  company: c.company ?? "",
  email: c.email ?? "",
  phone: c.phone ?? "",
  website: c.website ?? "",
  city: c.city ?? "",
});

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

/** Kişi ekleme/düzenleme formu. E-posta yazarken doğrulanır; kayıt düğmesi hatalıyken pasiftir. */
export function ContactForm({
  draft,
  onChange,
  contact,
  saving,
  finding,
  onSave,
  onCancel,
  onFind,
}: {
  draft: ContactDraft;
  onChange: (next: ContactDraft) => void;
  /** Düzenlenen kişi (yeni kişide null). */
  contact: Contact | null;
  saving: boolean;
  finding: boolean;
  onSave: () => void;
  onCancel: () => void;
  onFind?: () => void;
}) {
  const [touched, setTouched] = useState(false);
  const set = (key: keyof ContactDraft, value: string) => onChange({ ...draft, [key]: value });

  const emailError = draft.email.trim() && !isPlausibleEmail(cleanEmail(draft.email)) ? "Geçerli bir e-posta adresi yazın." : undefined;
  const emptyError = !draft.name.trim() && !draft.company.trim() && !draft.email.trim() ? "Ad, firma ya da e-postadan en az biri gerekli." : undefined;
  const invalid = Boolean(emailError || emptyError);

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
      <h3 className="text-lg font-semibold tracking-tight">{contact ? "Kişiyi düzenle" : "Kişi ekle"}</h3>

      <Field label="Firma" error={touched ? emptyError : undefined}>
        <input value={draft.company} onChange={(e) => set("company", e.target.value)} maxLength={160} placeholder="Örn. Lale Diş Kliniği" autoFocus className={inputClass} />
      </Field>
      <Field label="Ad soyad (isteğe bağlı)">
        <input value={draft.name} onChange={(e) => set("name", e.target.value)} maxLength={120} placeholder="Örn. Ayşe Demir" className={inputClass} />
      </Field>
      <Field label="E-posta" error={emailError}>
        <input
          type="email"
          value={draft.email}
          onChange={(e) => set("email", e.target.value)}
          maxLength={254}
          placeholder="ornek@firma.com"
          autoComplete="off"
          aria-invalid={emailError ? true : undefined}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefon">
          <input value={draft.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} placeholder="0216 000 00 00" className={inputClass} />
        </Field>
        <Field label="Şehir">
          <input value={draft.city} onChange={(e) => set("city", e.target.value)} maxLength={80} placeholder="Kadıköy" className={inputClass} />
        </Field>
      </div>
      <Field label="Web sitesi">
        <input value={draft.website} onChange={(e) => set("website", e.target.value)} maxLength={300} placeholder="firmaniz.com" autoCapitalize="none" className={inputClass} />
      </Field>

      {contact && (
        <div className="grid gap-2 rounded-row bg-sunken/60 p-3.5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {contact.email ? (
              <>
                <StatusChip status={contact.emailStatus} />
                <KindChip kind={contact.emailKind} />
              </>
            ) : (
              <StatusChip status="yok" />
            )}
          </div>
          {contact.discoveryNote && <p className="text-muted">{contact.discoveryNote}</p>}
          {contact.sourceUrl && (
            <a href={contact.sourceUrl} target="_blank" rel="noopener noreferrer" className="w-fit truncate text-forest underline underline-offset-4 hover:no-underline">
              Bulunduğu sayfa
            </a>
          )}
          {onFind && draft.website.trim() && (
            <Button variant="secondary" onClick={onFind} disabled={finding || saving} className="mt-1 w-fit">
              <SearchIcon size={16} />
              {finding ? "Taranıyor…" : contact.email ? "Siteyi yeniden tara" : "Siteden e-posta bul"}
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={saving || (touched && invalid)}>
          {saving ? "Kaydediliyor…" : contact ? "Kaydet" : "Kişiyi ekle"}
        </Button>
        <Button variant="quiet" onClick={onCancel} disabled={saving}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}
