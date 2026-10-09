"use client";

import { sendPasswordResetEmail, updateProfile } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { openAccountDialog } from "@/lib/account-dialog";
import { clientAuth } from "@/lib/firebase/client";
import { setTheme, useTheme } from "@/lib/theme";
import { isUnlimited } from "@/modules/outreach/plans";
import type { AccountSummary } from "@/modules/outreach/usage";

type Tab = "hesap" | "gorunum" | "plan" | "gizlilik";
const tabs: { key: Tab; label: string }[] = [
  { key: "hesap", label: "Hesap" },
  { key: "gorunum", label: "Görünüm" },
  { key: "plan", label: "Plan ve kullanım" },
  { key: "gizlilik", label: "Gizlilik ve güvenlik" },
];

const num = (n: number) => new Intl.NumberFormat("tr-TR").format(n);
const outlineLink = "inline-flex h-10 items-center rounded-control px-4 text-sm font-medium ring-1 ring-line-strong ring-inset transition-colors hover:bg-sunken";

function Block({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 border-b border-line pb-6 last:border-b-0 last:pb-0">
      <div>
        <h3 className="font-semibold tracking-tight">{title}</h3>
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Notice({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p role="status" className={`text-sm ${ok ? "text-accent" : "text-danger"}`}>
      {children}
    </p>
  );
}

function AccountTab({ name, email, onClose }: { name: string | null; email: string | null; onClose: () => void }) {
  const router = useRouter();
  const [value, setValue] = useState(name ?? "");
  const [busy, setBusy] = useState<"ad" | "sifre" | "cikis" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; for: "ad" | "sifre" } | null>(null);

  async function saveName() {
    const next = value.trim();
    if (next.length < 2) return setMsg({ ok: false, text: "Ad en az 2 karakter olmalı.", for: "ad" });
    setBusy("ad");
    try {
      const user = clientAuth().currentUser;
      if (!user) throw new Error("oturum");
      await updateProfile(user, { displayName: next.slice(0, 60) });
      // Sunucu oturum çerezi eski adı taşır; yenilenir.
      const idToken = await user.getIdToken(true);
      await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) });
      setMsg({ ok: true, text: "Adınız güncellendi.", for: "ad" });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Ad güncellenemedi. Çıkış yapıp yeniden giriş yaparak deneyin.", for: "ad" });
    }
    setBusy(null);
  }

  async function resetPassword() {
    if (!email) return;
    setBusy("sifre");
    try {
      await sendPasswordResetEmail(clientAuth(), email);
      setMsg({ ok: true, text: `Şifre sıfırlama bağlantısı ${email} adresine gönderildi.`, for: "sifre" });
    } catch {
      setMsg({ ok: false, text: "Bağlantı gönderilemedi. Biraz sonra tekrar deneyin.", for: "sifre" });
    }
    setBusy(null);
  }

  async function signOut() {
    setBusy("cikis");
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
    onClose();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <Block title="Kişisel bilgiler" hint="Adınız panelde ve gönderici bilgilerinizde görünür.">
        <div className="grid items-start gap-3 sm:grid-cols-2">
          <Field label="Ad soyad" value={value} onChange={(e) => setValue(e.target.value)} maxLength={60} autoComplete="name" />
          <Field label="E-posta" value={email ?? ""} readOnly disabled hint="Giriş e-postası değiştirilemez." />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={saveName} disabled={busy === "ad" || value.trim() === (name ?? "")}>
            {busy === "ad" ? "Kaydediliyor…" : "Kaydet"}
          </Button>
          {msg?.for === "ad" && <Notice ok={msg.ok}>{msg.text}</Notice>}
        </div>
      </Block>

      <Block title="İş profili" hint="Sektörünüz, hizmetleriniz ve hedef müşterileriniz; Adspine AI mesajları buna göre yazar.">
        <div>
          <Link href="/panel/profil" onClick={onClose} className={outlineLink}>
            Profili düzenle
          </Link>
        </div>
      </Block>

      <Block title="Şifre" hint="E-posta ve şifreyle giriş yapıyorsanız şifrenizi sıfırlama bağlantısıyla yenileyebilirsiniz. Google ile giriş yapıyorsanız şifreniz Google'dadır.">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={resetPassword} disabled={busy === "sifre" || !email}>
            {busy === "sifre" ? "Gönderiliyor…" : "Şifre sıfırlama bağlantısı gönder"}
          </Button>
          {msg?.for === "sifre" && <Notice ok={msg.ok}>{msg.text}</Notice>}
        </div>
      </Block>

      <Block title="Oturum">
        <div>
          <Button variant="secondary" onClick={signOut} disabled={busy === "cikis"}>
            {busy === "cikis" ? "Çıkış yapılıyor…" : "Oturumu kapat"}
          </Button>
        </div>
      </Block>
    </div>
  );
}

function AppearanceTab() {
  const theme = useTheme();
  return (
    <div className="grid gap-6">
      <Block title="Tema" hint="Panelin açık ya da koyu görünümü. Bu cihazda saklanır.">
        <div>
          <Segmented
            label="Tema"
            items={[
              { key: "light", label: "Açık", pressed: theme === "light", onClick: () => setTheme("light") },
              { key: "dark", label: "Koyu", pressed: theme === "dark", onClick: () => setTheme("dark") },
            ]}
          />
        </div>
      </Block>
    </div>
  );
}

function PlanTab() {
  const [data, setData] = useState<AccountSummary | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/outreach/account")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("yanıt"))))
      .then((j: { account: AccountSummary }) => live && setData(j.account))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);
  if (!data) return <p className="text-sm text-muted">{failed ? "Kullanım bilgisi şu an alınamadı." : "Yükleniyor…"}</p>;
  const unlimited = isUnlimited(data.plan);
  const rows: [string, string][] = [
    ["Kredi", unlimited ? "Sınırsız" : `${num(data.credits)} / ${num(data.plan.monthlyCredits)}`],
    ["Gönderici adresi", `${data.senders.used} / ${unlimited ? "∞" : data.senders.limit}`],
    ["Otomasyon", `${data.campaigns.used} / ${unlimited ? "∞" : data.campaigns.limit}`],
    ["Bu ay listelenen kişi", unlimited ? num(data.browse.used) : `${num(data.browse.used)} / ${num(data.browse.limit)}`],
    ["Son 24 saatte gönderilen", num(data.sending.today)],
  ];
  return (
    <div className="grid gap-6">
      <Block title="Mevcut plan">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-row bg-forest-soft/50 px-4 py-3 ring-1 ring-line">
          <p className="text-lg font-semibold tracking-tight">{data.plan.label}</p>
          {!unlimited && <Button onClick={() => openAccountDialog("planlar")}>Planı yükselt</Button>}
        </div>
      </Block>
      <Block title="Kullanım" hint="Krediler her ay başında yenilenir.">
        <dl className="grid divide-y divide-line rounded-row ring-1 ring-line">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <dt className="text-muted">{k}</dt>
              <dd className="font-medium tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </Block>
    </div>
  );
}

function PrivacyTab({ onClose }: { onClose: () => void }) {
  const links: [string, string, string][] = [
    ["/gizlilik", "Gizlilik politikası", "Verilerinizin nasıl işlendiğini okuyun."],
    ["/veri-silme", "Veri silme ve itiraz", "Kendi verilerinizin ya da bir alıcının verilerinin silinmesini isteyin."],
  ];
  return (
    <div className="grid gap-6">
      <Block title="Veri ve gizlilik">
        <ul className="grid gap-2">
          {links.map(([href, title, hint]) => (
            <li key={href}>
              <Link href={href} target="_blank" onClick={onClose} className="grid gap-0.5 rounded-row px-4 py-3 ring-1 ring-line transition-colors hover:bg-sunken">
                <span className="font-medium">{title}</span>
                <span className="text-sm text-muted">{hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Block>
      <Block title="Hesabı kapatma" hint="Hesabınızın ve tüm verilerinizin silinmesi için info@adspine.app adresine hesap e-postanızla yazın; 30 gün içinde tamamlanır.">
        <div>
          <a href="mailto:info@adspine.app?subject=Hesabimin%20silinmesi" className={outlineLink}>
            Silme talebi gönder
          </a>
        </div>
      </Block>
    </div>
  );
}

/** Ayarlar penceresi: solda bölümler, sağda içerik (dar ekranda üstte sekmeler). */
export function SettingsDialog({ open, onClose, name, email }: { open: boolean; onClose: () => void; name: string | null; email: string | null }) {
  const [tab, setTab] = useState<Tab>("hesap");
  return (
    <Modal open={open} onClose={onClose} title="Ayarlar" width="52rem">
      <div className="grid min-h-[26rem] gap-6 sm:grid-cols-[11rem_minmax(0,1fr)]">
        <nav aria-label="Ayar bölümleri" className="flex flex-wrap gap-1 sm:grid sm:content-start">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-current={tab === t.key ? "page" : undefined}
              onClick={() => setTab(t.key)}
              className="rounded-control px-3 py-2 text-left text-sm whitespace-nowrap transition-colors hover:bg-sunken aria-[current=page]:bg-forest-soft aria-[current=page]:font-medium aria-[current=page]:text-accent"
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          {tab === "hesap" && <AccountTab name={name} email={email} onClose={onClose} />}
          {tab === "gorunum" && <AppearanceTab />}
          {tab === "plan" && <PlanTab />}
          {tab === "gizlilik" && <PrivacyTab onClose={onClose} />}
        </div>
      </div>
    </Modal>
  );
}
