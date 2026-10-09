"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { CheckIcon, MailIcon } from "@/components/ui/icons";
import { RotatingTips } from "@/components/ui/rotating-tips";
import { Select } from "@/components/ui/select";
import { ShapeLoader } from "@/components/ui/shape-loader";
import { toast } from "@/components/ui/toast";
import type { Mailbox } from "@/modules/outreach/mailbox-schema";
import { passwordHelp, presetFor, providerLabels, type Provider, type ServerConfig } from "@/modules/outreach/presets";
import { api } from "../../kisiler/_components/contact-ui";

const connectTips = ["Gönderme (SMTP) bağlantısı sınanıyor…", "Okuma (IMAP) bağlantısı sınanıyor…", "Alan adı ayarları (SPF, DKIM, DMARC) denetleniyor…"];

const inputClass =
  "h-11 w-full min-w-0 rounded-control bg-surface px-3.5 ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest aria-invalid:ring-danger";

const providerNote: Record<Provider, string> = {
  google: "Google ile bağlan",
  gmail: "Gmail ve Google Workspace",
  outlook: "Outlook, Hotmail, Microsoft 365",
  ozel: "Herhangi bir sağlayıcı (SMTP/IMAP)",
};

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {hint && <span className="-mt-1 text-sm font-normal text-muted">{hint}</span>}
      {children}
      {error && (
        <span role="alert" className="text-sm font-normal text-danger">
          {error}
        </span>
      )}
    </label>
  );
}

function ServerFields({ legend, value, onChange, ports }: { legend: string; value: ServerConfig; onChange: (v: ServerConfig) => void; ports: number[] }) {
  return (
    <fieldset className="grid gap-3 rounded-row bg-sunken/60 p-3.5">
      <legend className="px-1 text-sm font-medium">{legend}</legend>
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
        <input aria-label={`${legend} sunucu adı`} value={value.host} onChange={(e) => onChange({ ...value, host: e.target.value.trim() })} placeholder="smtp.firma.com" autoCapitalize="none" className={inputClass} />
        <Select<string>
          label={`${legend} portu`}
          value={String(value.port)}
          options={ports.map((p) => ({ value: String(p), label: String(p) }))}
          onChange={(v) => onChange({ ...value, port: Number(v), secure: Number(v) === 465 || Number(v) === 993 })}
        />
      </div>
    </fieldset>
  );
}

/**
 * Gönderici adresi bağlama sihirbazı: sağlayıcı seç → bilgileri gir → bağla ve doğrula.
 * Kaydetmeden önce SMTP ve IMAP girişi sınanır; şifre sunucuda şifrelenir.
 */
export function MailboxWizard({ onDone, onCancel, googleReady }: { onDone: (m: Mailbox) => void; onCancel: () => void; googleReady: boolean }) {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [email, setEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [password, setPassword] = useState("");
  const [smtp, setSmtp] = useState<ServerConfig>({ host: "", port: 465, secure: true });
  const [imap, setImap] = useState<ServerConfig>({ host: "", port: 993, secure: true });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [googleConsent, setGoogleConsent] = useState(false);
  const [googleTouched, setGoogleTouched] = useState(false);
  /** Gmail / Google Workspace seçildi: bağlantı yöntemi (OAuth ya da uygulama şifresi) seçiliyor. */
  const [googleChoice, setGoogleChoice] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const emailError = email.trim() && !emailValid ? "Geçerli bir e-posta adresi yazın." : undefined;

  function choose(p: Provider) {
    setProvider(p);
    setError(null);
    if (emailValid || p !== "ozel") {
      const preset = presetFor(p, emailValid ? email.trim().toLowerCase() : "ornek@firma.com");
      setSmtp(preset.smtp);
      setImap(preset.imap);
    }
  }

  /** E-posta yazıldıktan sonra sağlayıcıyı (özel alan adlı Workspace/365 dahil) tahmin edip sunucuları doldurur. */
  async function detect() {
    if (!emailValid) return;
    const r = await api<{ provider: Provider; smtp: ServerConfig; imap: ServerConfig }>(`/api/outreach/mailboxes/detect?email=${encodeURIComponent(email.trim())}`);
    if (!r.ok) return;
    setProvider(r.data.provider);
    setSmtp(r.data.smtp);
    setImap(r.data.imap);
  }

  async function connect() {
    if (!provider || busy) return;
    setTouched(true);
    if (!emailValid || password.length < 4 || !consent || !smtp.host || !imap.host) return;
    setBusy(true);
    setError(null);
    const r = await api<{ mailbox: Mailbox }>("/api/outreach/mailboxes", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase(), fromName: fromName.trim() || null, provider, password, smtp, imap, consent: true }),
    });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast("Gönderici adresi bağlandı");
    onDone(r.data.mailbox);
  }

  if (busy) {
    return (
      <div role="status" className="grid justify-items-center gap-7 py-10 text-center">
        <ShapeLoader />
        <RotatingTips tips={connectTips} label={null} />
      </div>
    );
  }

  if (!provider && googleChoice) {
    const pros = ["Kurulumu daha kolay", "Daha istikrarlı, daha az bağlantı kopması", "Google Workspace hesapları için de geçerlidir"];
    const cons = ["Bireysel hesaplar için kullanılabilir", "İki faktörlü kimlik doğrulama gerekir", "Bağlantı kopmalarına daha yatkın"];
    return (
      <div className="grid gap-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sunken">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.32 2.98-7.35Z" />
              <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.5c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.76-5.59-4.12H3.07v2.58A10 10 0 0 0 12 22Z" />
              <path fill="#FBBC05" d="M6.41 13.91a6 6 0 0 1 0-3.82V7.51H3.07a10 10 0 0 0 0 8.98l3.34-2.58Z" />
              <path fill="#EA4335" d="M12 5.97c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.95 2.99 14.7 2 12 2A10 10 0 0 0 3.07 7.51l3.34 2.58C7.2 7.73 9.4 5.97 12 5.97Z" />
            </svg>
          </span>
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Google hesabınızı bağlayın</h3>
            <p className="text-sm text-muted">Gmail / Google Workspace · bağlantı yöntemini seçin</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <section aria-label="OAuth ile bağlan" className="grid content-start gap-4 rounded-row p-4 ring-2 ring-forest/60">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">OAuth</h4>
              <span className="rounded-full bg-forest-soft px-2.5 py-0.5 text-xs font-medium text-accent">Önerilen</span>
            </div>
            <ul className="grid gap-2 text-sm">
              {pros.map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span className="mt-0.5 shrink-0 text-accent">
                    <CheckIcon size={14} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <label className="flex items-start gap-2.5 text-xs text-muted">
              <input type="checkbox" checked={googleConsent} onChange={(e) => setGoogleConsent(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--color-forest)]" />
              <span>Yalnızca izinli, işle ilgili alıcılara yazacağımı ve her e-postada çıkış yolu (“İPTAL” yazarak yanıtlama) bulunacağını kabul ediyorum.</span>
            </label>
            {googleTouched && !googleConsent && (
              <p role="alert" className="-mt-2 text-sm text-danger">
                Devam etmek için onay kutusunu işaretleyin.
              </p>
            )}
            <Button
              disabled={!googleReady}
              onClick={() => {
                setGoogleTouched(true);
                if (googleConsent) window.location.assign(new URL("/api/outreach/oauth/google/start", window.location.origin));
              }}
              className="w-full"
            >
              OAuth ile bağlantı kur
            </Button>
            <p className="text-xs text-muted">
              {googleReady
                ? "Google, e-posta gönderme ve gelen yanıtları okuma izni ister; iletilerinizi silmez ya da değiştirmeyiz. “Doğrulanmamış uygulama” uyarısı görürseniz Gelişmiş → devam edin."
                : "Google bağlantısı şu an etkin değil; uygulama şifresiyle bağlanabilirsiniz."}
            </p>
          </section>

          <section aria-label="Uygulama şifresiyle bağlan" className="grid content-start gap-4 rounded-row p-4 ring-1 ring-line-strong">
            <h4 className="font-semibold">Uygulama şifresi</h4>
            <ul className="grid gap-2 text-sm">
              {cons.map((t, i) => (
                <li key={t} className="flex gap-2.5">
                  <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[0.65rem] font-bold ${i === 0 ? "bg-forest-soft text-accent" : "bg-danger-soft text-danger"}`}>{i === 0 ? "✓" : "!"}</span>
                  {t}
                </li>
              ))}
            </ul>
            <Button variant="secondary" onClick={() => choose("gmail")} className="mt-auto w-full">
              Uygulama şifresiyle bağlan
            </Button>
          </section>
        </div>

        <Button variant="quiet" onClick={() => setGoogleChoice(false)} className="w-fit">
          Geri
        </Button>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-muted">E-postaları kendi adresinizden göndereceğiz. Hesabınızın sağlayıcısını seçin.</p>
        <div className="grid gap-2.5">
          {(["gmail", "outlook", "ozel"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => (p === "gmail" ? setGoogleChoice(true) : choose(p))}
              className="flex items-center gap-3.5 rounded-row p-4 text-left ring-1 ring-line-strong ring-inset transition-colors hover:bg-forest-soft/60 hover:ring-forest/50"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sunken text-accent">
                <MailIcon size={20} />
              </span>
              <span className="grid gap-0.5">
                <span className="font-medium">{providerLabels[p]}</span>
                <span className="text-sm text-muted">{providerNote[p]}</span>
              </span>
            </button>
          ))}
        </div>
        <Button variant="quiet" onClick={onCancel} className="w-fit">
          Vazgeç
        </Button>
      </div>
    );
  }

  const help = passwordHelp[provider];
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void connect();
      }}
      className="grid gap-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight">{providerLabels[provider]}</h3>
        <button type="button" onClick={() => setProvider(null)} className="text-sm text-muted underline underline-offset-4 hover:text-ink">
          {provider === "gmail" ? "Yöntemi değiştir" : "Sağlayıcıyı değiştir"}
        </button>
      </div>

      <Field label="E-posta adresi" error={emailError}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => void detect()}
          autoComplete="off"
          autoFocus
          maxLength={254}
          placeholder="ad@firmaniz.com"
          aria-invalid={emailError ? true : undefined}
          className={inputClass}
        />
      </Field>
      <Field label="Gönderen adı" hint="Alıcı e-postayı bu adla görür. Örn. Elif Yıldız">
        <input value={fromName} onChange={(e) => setFromName(e.target.value)} maxLength={80} placeholder="Elif Yıldız" className={inputClass} />
      </Field>
      <Field label={help.label} error={touched && password.length < 4 ? "Şifreyi yazın." : undefined}>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" maxLength={200} className={inputClass} />
      </Field>

      <Disclosure
        className="rounded-row ring-1 ring-line"
        buttonClassName="px-4 py-3"
        panelClassName="px-4 pb-4"
        summary={<span className="text-sm font-medium">{provider === "ozel" ? "Sunucu ayarları (gerekli)" : "Şifreyi nereden alırım?"}</span>}
        defaultOpen={provider === "ozel"}
      >
        <div className="grid gap-4">
          <ol className="grid list-decimal gap-1.5 pl-5 text-sm text-muted">
            {help.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          {help.link && (
            <a href={help.link.href} target="_blank" rel="noopener noreferrer" className="w-fit text-sm font-medium text-accent underline underline-offset-4 hover:no-underline">
              {help.link.text}
            </a>
          )}
          <ServerFields legend="Gönderme (SMTP)" value={smtp} onChange={setSmtp} ports={[465, 587, 25, 2525]} />
          <ServerFields legend="Okuma (IMAP)" value={imap} onChange={setImap} ports={[993, 143]} />
        </div>
      </Disclosure>

      <label className="flex items-start gap-3 rounded-row bg-sunken/60 p-3.5 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--color-forest)]" />
        <span>
          Spam ya da taciz amaçlı e-posta göndermeyeceğimi, alıcılara abonelikten çıkma imkânı sunulacağını ve ticari ileti mevzuatına uymanın benim sorumluluğumda olduğunu kabul
          ediyorum. Adspine&apos;in, gönderim ve yanıt takibi için gönderici adresimin e-posta başlıklarını ve içeriğini işlemesine izin veriyorum.
        </span>
      </label>
      {touched && !consent && (
        <p role="alert" className="-mt-2 text-sm text-danger">
          Devam etmek için onay kutusunu işaretleyin.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit">Bağla ve doğrula</Button>
        <Button variant="quiet" onClick={onCancel}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}
