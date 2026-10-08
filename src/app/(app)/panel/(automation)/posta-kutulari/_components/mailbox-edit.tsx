"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/text-fields";
import { toast } from "@/components/ui/toast";
import type { Mailbox } from "@/modules/outreach/mailbox-schema";
import { api } from "../../kisiler/_components/contact-ui";

const inputClass =
  "h-11 w-full min-w-0 rounded-control bg-surface px-3.5 ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest aria-invalid:ring-danger";

function NumberField({ label, hint, value, onChange, error }: { label: string; hint: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 3))} aria-invalid={error ? true : undefined} className={inputClass} />
      <span className={`text-sm font-normal ${error ? "text-danger" : "text-muted"}`} role={error ? "alert" : undefined}>
        {error ?? hint}
      </span>
    </label>
  );
}

/** Posta kutusu ayarları: gönderen adı, imza, günlük/saatlik limit, (hata varsa) şifreyi yenileme. */
export function MailboxEdit({ mailbox, onSaved, onCancel }: { mailbox: Mailbox; onSaved: (m: Mailbox) => void; onCancel: () => void }) {
  const [fromName, setFromName] = useState(mailbox.fromName ?? "");
  const [signature, setSignature] = useState(mailbox.signature);
  const [daily, setDaily] = useState(String(mailbox.dailyLimit));
  const [hourly, setHourly] = useState(String(mailbox.hourlyLimit));
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const d = Number(daily);
  const h = Number(hourly);
  const dailyError = !daily || d < 1 ? "En az 1 olmalı." : d > 500 ? "En çok 500." : undefined;
  const hourlyError = !hourly || h < 1 ? "En az 1 olmalı." : h > 100 ? "En çok 100." : h > d ? "Saatlik limit günlükten büyük olamaz." : undefined;
  const invalid = Boolean(dailyError || hourlyError);

  async function save() {
    if (invalid || busy) return;
    setBusy(true);
    const r = await api<{ mailbox: Mailbox }>(`/api/outreach/mailboxes/${mailbox.id}`, {
      method: "PATCH",
      body: JSON.stringify({ fromName: fromName.trim() || null, signature, dailyLimit: d, hourlyLimit: h, ...(password ? { password } : {}) }),
    });
    setBusy(false);
    if (!r.ok) return toast(r.error, { kind: "error" });
    toast("Posta kutusu güncellendi");
    onSaved(r.data.mailbox);
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="grid gap-4"
    >
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Posta kutusu ayarları</h3>
        <p className="text-sm text-muted">{mailbox.email}</p>
      </div>

      {mailbox.status === "hata" && (
        <div className="grid gap-2 rounded-row bg-danger-soft p-3.5 text-sm text-danger">
          <p role="alert">{mailbox.lastError ?? "Bağlantı hatası."}</p>
          <label className="grid gap-1.5 font-medium">
            Yeni şifre / uygulama şifresi
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={`${inputClass} text-ink`} />
          </label>
        </div>
      )}

      <label className="grid gap-1.5 text-sm font-medium">
        Gönderen adı
        <input value={fromName} onChange={(e) => setFromName(e.target.value)} maxLength={80} className={inputClass} />
      </label>

      <TextArea label="İmza" hint="Her e-postanın sonuna eklenir (kampanyada “imzayı ekle” açıksa)." value={signature} onChange={(e) => setSignature(e.target.value)} maxLength={1000} placeholder={"Elif Yıldız\nYıldız Mali Müşavirlik\n0216 000 00 00"} />

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Günlük limit" hint="Yeni kutuda 20 ile başlayın; 50'yi aşmayın." value={daily} onChange={setDaily} error={dailyError} />
        <NumberField label="Saatlik limit" hint="Önerilen: saatte en çok 6." value={hourly} onChange={setHourly} error={hourlyError} />
      </div>
      {!dailyError && d > 50 && <p className="-mt-2 rounded-control bg-pollen/50 px-3 py-2 text-sm">Günde 50&apos;den fazla e-posta, özellikle yeni bir kutuda, spam&apos;e düşme riskini belirgin artırır.</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={busy || invalid}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </Button>
        <Button variant="quiet" onClick={onCancel} disabled={busy}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}
