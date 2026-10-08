"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { CheckIcon, CopyIcon, MailIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { toast, Toaster } from "@/components/ui/toast";
import type { DnsCheck, DnsReport } from "@/modules/outreach/dns-health";
import type { Mailbox } from "@/modules/outreach/mailbox-schema";
import { providerLabels } from "@/modules/outreach/presets";
import { api } from "../../kisiler/_components/contact-ui";
import { MailboxEdit } from "./mailbox-edit";
import { MailboxWizard } from "./mailbox-wizard";

type Panel = { mode: "new" } | { mode: "edit"; id: string } | null;

const statusStyle = { bagli: "bg-forest-soft text-forest", hata: "bg-danger-soft text-danger", duraklatildi: "bg-sunken text-muted" } as const;
const statusLabel = { bagli: "Bağlı", hata: "Hata", duraklatildi: "Duraklatıldı" } as const;
const dnsStyle = { ok: "text-forest", uyari: "text-ink", eksik: "text-danger" } as const;
const dnsMark = { ok: "✓", uyari: "!", eksik: "✕" } as const;

function dnsSummary(report: DnsReport | null): { label: string; tone: "ok" | "uyari" | "eksik" } {
  if (!report) return { label: "Denetlenmedi", tone: "uyari" };
  if (report.ready) return { label: "Hazır", tone: "ok" };
  const bad = report.checks.filter((c) => c.status !== "ok").length;
  return { label: `${bad} eksik`, tone: "eksik" };
}

function CopyButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      aria-label="Kaydı kopyala"
      onClick={() => navigator.clipboard.writeText(text).then(() => toast("Kopyalandı"), () => toast("Kopyalanamadı. Elle kopyalayın.", { kind: "error" }))}
      className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink"
    >
      <CopyIcon size={14} />
    </button>
  );
}

function DnsRow({ check }: { check: DnsCheck }) {
  return (
    <li className="grid gap-1.5 py-2.5">
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 w-4 shrink-0 text-center font-semibold ${dnsStyle[check.status]}`} aria-hidden="true">
          {dnsMark[check.status]}
        </span>
        <div className="grid min-w-0 gap-0.5">
          <span className="text-sm font-medium">
            {check.title}
            <span className="sr-only"> — {check.status === "ok" ? "tamam" : check.status === "uyari" ? "uyarı" : "eksik"}</span>
          </span>
          <span className="text-sm text-muted">{check.detail}</span>
        </div>
      </div>
      {check.fix && (
        <div className="ml-6.5 grid gap-1 rounded-control bg-sunken/70 px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted">
              {check.fix.type} kaydı ekleyin · Ad: <span className="font-medium text-ink">{check.fix.host}</span>
            </span>
            <CopyButton text={check.fix.value} />
          </div>
          <code className="break-all text-ink">{check.fix.value}</code>
        </div>
      )}
    </li>
  );
}

/** Posta kutuları: bağlı kutular, durum, alan adı sağlığı (SPF/DKIM/DMARC), test e-postası, ayarlar. */
export function MailboxesWorkspace({ initial, unavailable, encryptionReady }: { initial: Mailbox[]; unavailable: boolean; encryptionReady: boolean }) {
  const [mailboxes, setMailboxes] = useState(initial);
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const put = (m: Mailbox) => setMailboxes((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m]));

  async function test(m: Mailbox) {
    setBusy(`test-${m.id}`);
    const r = await api<{ ok: true; to: string }>(`/api/outreach/mailboxes/${m.id}/test`, { method: "POST" });
    setBusy(null);
    if (!r.ok) {
      put({ ...m, status: "hata", lastError: r.error });
      return toast(r.error, { kind: "error" });
    }
    if (m.status === "hata") put({ ...m, status: "bagli", lastError: null });
    toast(`Test e-postası ${r.data.to} adresine gönderildi`);
  }

  async function recheckDns(m: Mailbox) {
    setBusy(`dns-${m.id}`);
    const r = await api<{ mailbox: Mailbox }>(`/api/outreach/mailboxes/${m.id}/dns`, { method: "POST" });
    setBusy(null);
    if (!r.ok) return toast(r.error, { kind: "error" });
    put(r.data.mailbox);
    toast(r.data.mailbox.dnsCheck?.ready ? "Alan adı ayarları hazır" : "Alan adı yeniden denetlendi");
  }

  async function togglePause(m: Mailbox) {
    const next = m.status === "duraklatildi" ? "bagli" : "duraklatildi";
    const r = await api<{ mailbox: Mailbox }>(`/api/outreach/mailboxes/${m.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    if (!r.ok) return toast(r.error, { kind: "error" });
    put(r.data.mailbox);
    toast(next === "bagli" ? "Posta kutusu sürdürüldü" : "Posta kutusu duraklatıldı");
  }

  async function remove(m: Mailbox) {
    const r = await api<{ ok: true }>(`/api/outreach/mailboxes/${m.id}`, { method: "DELETE" });
    if (!r.ok) return toast(r.error, { kind: "error" });
    setMailboxes((prev) => prev.filter((x) => x.id !== m.id));
    setPanel(null);
    toast("Posta kutusu bağlantıdan çıkarıldı");
  }

  if (unavailable) {
    return (
      <div role="status" className="grid justify-items-center gap-3 rounded-panel bg-surface px-6 py-16 text-center ring-1 ring-line">
        <Toaster />
        <p className="text-lg font-semibold tracking-tight">Posta kutuları henüz etkinleştirilmedi</p>
        <p className="max-w-[30rem] text-muted">Bu bölüm için veritabanı güncellemesi gerekiyor. Kısa süre sonra tekrar deneyin.</p>
      </div>
    );
  }

  const ready = mailboxes.filter((m) => m.status === "bagli" && m.dnsCheck?.ready).length;
  const editing = panel?.mode === "edit" ? mailboxes.find((m) => m.id === panel.id) : undefined;

  return (
    <div className="grid gap-5">
      <Toaster />
      {!encryptionReady && (
        <p role="alert" className="rounded-row bg-danger-soft px-4 py-3 text-sm text-danger">
          Sunucuda posta kutusu şifreleme anahtarı (OUTREACH_ENC_KEY) tanımlı değil; posta kutusu bağlanamaz.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Posta kutularınız</h2>
          <p className="max-w-[44rem] text-muted">
            Kampanyalar bu adreslerden gönderilir. Alan adınızın SPF, DKIM ve DMARC ayarları tamamsa e-postalarınız daha çok gelen kutusuna düşer.
          </p>
        </div>
        <Button onClick={() => setPanel({ mode: "new" })} disabled={!encryptionReady}>
          <PlusIcon size={16} />
          Posta kutusu bağla
        </Button>
      </div>

      <div className={`grid items-start gap-6 ${panel ? "lg:grid-cols-[minmax(0,1fr)_26rem]" : ""}`}>
        <section aria-label="Posta kutuları" className="grid gap-3">
          {mailboxes.length > 0 && (
            <p className="text-sm text-muted">
              {mailboxes.length} posta kutusu · {ready} tanesi gönderime hazır
            </p>
          )}

          {mailboxes.length === 0 ? (
            <div className="grid justify-items-center gap-4 rounded-panel bg-surface px-6 py-16 text-center ring-1 ring-line">
              <span className="grid size-12 place-items-center rounded-full bg-forest-soft text-forest">
                <MailIcon size={22} />
              </span>
              <p className="text-lg font-semibold tracking-tight">Henüz posta kutusu bağlamadınız</p>
              <p className="max-w-[30rem] text-muted">E-posta kampanyası göndermek için en az bir posta kutusu bağlayın. Gmail, Google Workspace, Outlook ve her SMTP/IMAP kutusu desteklenir.</p>
              <Button onClick={() => setPanel({ mode: "new" })} disabled={!encryptionReady}>
                <PlusIcon size={16} />
                Posta kutusu bağla
              </Button>
            </div>
          ) : (
            mailboxes.map((m) => {
              const dns = dnsSummary(m.dnsCheck);
              return (
                <article key={m.id} className="rounded-panel bg-surface ring-1 ring-line">
                  <div className="grid gap-3 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="grid min-w-0 gap-1">
                        <h3 className="truncate text-lg font-semibold tracking-tight">{m.email}</h3>
                        <p className="text-sm text-muted">
                          {providerLabels[m.provider]}
                          {m.fromName ? ` · ${m.fromName}` : ""}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[m.status]}`}>{statusLabel[m.status]}</span>
                    </div>

                    {m.status === "hata" && m.lastError && (
                      <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger">
                        {m.lastError}
                      </p>
                    )}

                    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <dt className="text-muted">Alan adı kurulumu</dt>
                        <dd className={`font-medium ${dnsStyle[dns.tone]}`}>{dns.label}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Isınma</dt>
                        <dd className="font-medium">{m.warmupEnabled ? (m.warmupScore !== null ? `%${m.warmupScore}` : "Başladı") : "Kapalı"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Günlük limit</dt>
                        <dd className="font-medium tabular-nums">{m.dailyLimit} e-posta</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Saatlik limit</dt>
                        <dd className="font-medium tabular-nums">{m.hourlyLimit} e-posta</dd>
                      </div>
                    </dl>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="secondary" onClick={() => void test(m)} disabled={busy === `test-${m.id}` || m.status === "duraklatildi"}>
                        {busy === `test-${m.id}` ? "Gönderiliyor…" : "Test e-postası gönder"}
                      </Button>
                      <Button variant="quiet" onClick={() => setPanel({ mode: "edit", id: m.id })}>
                        Ayarlar
                      </Button>
                      <Button variant="quiet" onClick={() => void togglePause(m)}>
                        {m.status === "duraklatildi" ? "Sürdür" : "Duraklat"}
                      </Button>
                      <Button variant="quiet" onClick={() => void remove(m)} className="ml-auto text-danger" aria-label={`${m.email} bağlantısını kaldır`}>
                        <TrashIcon size={16} />
                        Kaldır
                      </Button>
                    </div>
                  </div>

                  <Disclosure
                    className="border-t border-line"
                    buttonClassName="px-5 py-3.5"
                    panelClassName="px-5 pb-5"
                    summary={
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {dns.tone === "ok" && (
                          <span className="text-forest">
                            <CheckIcon size={16} />
                          </span>
                        )}
                        Alan adı sağlığı (SPF · DKIM · DMARC)
                      </span>
                    }
                  >
                    {m.dnsCheck ? (
                      <div className="grid gap-2">
                        <ul className="divide-y divide-line">
                          {m.dnsCheck.checks.map((c) => (
                            <DnsRow key={c.key} check={c} />
                          ))}
                        </ul>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-muted">
                            Son denetim: {m.dnsCheckedAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(m.dnsCheckedAt)) : "—"}. Kayıtların yayılması
                            birkaç saat sürebilir.
                          </p>
                          <Button variant="secondary" onClick={() => void recheckDns(m)} disabled={busy === `dns-${m.id}`}>
                            {busy === `dns-${m.id}` ? "Denetleniyor…" : "Yeniden denetle"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="secondary" onClick={() => void recheckDns(m)} disabled={busy === `dns-${m.id}`}>
                        {busy === `dns-${m.id}` ? "Denetleniyor…" : "Alan adını denetle"}
                      </Button>
                    )}
                  </Disclosure>
                </article>
              );
            })
          )}
        </section>

        {panel && (
          <aside aria-label={panel.mode === "new" ? "Posta kutusu bağla" : "Posta kutusu ayarları"} className="rounded-panel bg-surface p-5 ring-1 ring-line lg:sticky lg:top-6">
            {panel.mode === "new" ? (
              <MailboxWizard
                onDone={(m) => {
                  put(m);
                  setPanel(null);
                }}
                onCancel={() => setPanel(null)}
              />
            ) : editing ? (
              <MailboxEdit
                key={editing.id}
                mailbox={editing}
                onSaved={(m) => {
                  put(m);
                  setPanel(null);
                }}
                onCancel={() => setPanel(null)}
              />
            ) : null}
          </aside>
        )}
      </div>
    </div>
  );
}
