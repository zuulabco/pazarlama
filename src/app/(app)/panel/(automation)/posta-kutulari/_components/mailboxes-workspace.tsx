"use client";

import { Fragment, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon, MailIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { fold } from "@/lib/text";
import { toast, Toaster } from "@/components/ui/toast";
import type { DnsCheck, DnsReport } from "@/modules/outreach/dns-health";
import type { Mailbox } from "@/modules/outreach/mailbox-schema";
import { providerLabels } from "@/modules/outreach/presets";
import { api } from "../../kisiler/_components/contact-ui";
import { MailboxEdit } from "./mailbox-edit";
import { MailboxWizard } from "./mailbox-wizard";

type Panel = { mode: "new" } | { mode: "edit"; id: string } | null;

const statusStyle = { bagli: "bg-forest-soft text-accent", hata: "bg-danger-soft text-danger", duraklatildi: "bg-sunken text-muted" } as const;
const statusLabel = { bagli: "Bağlı", hata: "Hata", duraklatildi: "Duraklatıldı" } as const;
const dnsStyle = { ok: "text-accent", uyari: "text-ink", eksik: "text-danger" } as const;
const dnsMark = { ok: "✓", uyari: "!", eksik: "✕" } as const;

function dnsSummary(report: DnsReport | null): { label: string; tone: "ok" | "uyari" | "eksik" } {
  if (!report) return { label: "Denetlenmedi", tone: "uyari" };
  if (report.ready) return { label: "Hazır", tone: "ok" };
  const bad = report.checks.filter((c) => c.status !== "ok").length;
  return { label: `${bad} eksik`, tone: "eksik" };
}

/** Alan adı kurulum puanı (0-100): SPF, DKIM, DMARC ve MX denetimlerinin kaçı tamam. Denetlenmediyse null. */
export function healthScore(report: DnsReport | null): number | null {
  if (!report || report.checks.length === 0) return null;
  return Math.round((report.checks.filter((c) => c.status === "ok").length / report.checks.length) * 100);
}

const warmupDay = (startedAt: string | null) => (startedAt ? Math.floor((Date.now() - Date.parse(startedAt)) / 86_400_000) + 1 : 1);

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

/** Gönderici adresleri: bağlı kutular, durum, alan adı sağlığı (SPF/DKIM/DMARC), test e-postası, ayarlar. */
export function MailboxesWorkspace({ initial, unavailable, encryptionReady, googleReady, plan }: { initial: Mailbox[]; unavailable: boolean; encryptionReady: boolean; googleReady: boolean; plan: { label: string; senders: number } | null }) {
  const [mailboxes, setMailboxes] = useState(initial);
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  // "Google ile bağlan" dönüşünün sonucu adres çubuğunda gelir; bir kez bildirilip temizlenir.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const result = q.get("google");
    if (!result) return;
    const reasons: Record<string, string> = {
      reddedildi: "Google bağlantısı iptal edildi.",
      izin: "Gönderme ve okuma izinlerinin ikisini de vermeniz gerekiyor. Tekrar deneyip tüm kutuları işaretleyin.",
      oturum: "Bağlantı oturumu zaman aşımına uğradı. Tekrar deneyin.",
      limit: "Paketinizin gönderici adresi sınırına ulaştınız.",
      yapilandirma: "Google ile bağlanma henüz etkin değil.",
    };
    if (result === "ok") toast(`${q.get("email") ?? "Gönderici adresi"} bağlandı`);
    else toast(reasons[q.get("neden") ?? ""] ?? "Google ile bağlanılamadı. Tekrar deneyin.", { kind: "error" });
    window.history.replaceState(null, "", window.location.pathname);
    if (result === "ok") window.location.reload();
  }, []);

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
    toast(next === "bagli" ? "Gönderici adresi sürdürüldü" : "Gönderici adresi duraklatıldı");
  }

  async function remove(m: Mailbox) {
    const r = await api<{ ok: true }>(`/api/outreach/mailboxes/${m.id}`, { method: "DELETE" });
    if (!r.ok) return toast(r.error, { kind: "error" });
    setMailboxes((prev) => prev.filter((x) => x.id !== m.id));
    setPanel(null);
    toast("Gönderici adresi bağlantıdan çıkarıldı");
  }

  if (unavailable) {
    return (
      <div role="status" className="grid justify-items-center gap-3 rounded-panel bg-surface px-6 py-16 text-center ring-1 ring-line">
        <Toaster />
        <p className="text-lg font-semibold tracking-tight">Gönderici adresleri henüz etkinleştirilmedi</p>
        <p className="max-w-[30rem] text-muted">Bu bölüm için veritabanı güncellemesi gerekiyor. Kısa süre sonra tekrar deneyin.</p>
      </div>
    );
  }

  const shown = mailboxes.filter((m) => !query.trim() || fold(m.email).includes(fold(query.trim())));
  const editing = panel?.mode === "edit" ? mailboxes.find((m) => m.id === panel.id) : undefined;

  return (
    <div className="grid gap-5">
      <Toaster />
      {!encryptionReady && (
        <p role="alert" className="rounded-row bg-danger-soft px-4 py-3 text-sm text-danger">
          Sunucuda gönderici adresi şifreleme anahtarı (OUTREACH_ENC_KEY) tanımlı değil; gönderici adresi bağlanamaz.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[14rem] flex-1 sm:max-w-xs">
          <span className="sr-only">Gönderici adresi ara</span>
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
            <SearchIcon size={15} />
          </span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ara" className="h-10 w-full rounded-control bg-surface pr-3 pl-9 ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest" />
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {plan && (
            <span className="rounded-full bg-sunken px-3 py-1.5 text-sm" title={`${plan.label} paketi`}>
              <span className="font-medium tabular-nums">
                {mailboxes.length} / {plan.senders}
              </span>{" "}
              gönderici adresi
            </span>
          )}
          <Button onClick={() => setPanel({ mode: "new" })} disabled={!encryptionReady || (plan !== null && mailboxes.length >= plan.senders)}>
            <PlusIcon size={16} />
            Gönderici adresi bağla
          </Button>
        </div>
      </div>
      {plan && mailboxes.length >= plan.senders && (
        <p role="status" className="rounded-row bg-pollen/50 px-4 py-3 text-sm">
          {plan.label} paketinde en fazla {plan.senders} gönderici adresi bağlayabilirsiniz. Daha fazlası için paketinizi yükseltin.
        </p>
      )}

      {mailboxes.length === 0 ? (
        <div className="grid justify-items-center gap-4 rounded-panel bg-surface px-6 py-16 text-center ring-1 ring-line">
          <span className="grid size-12 place-items-center rounded-full bg-forest-soft text-accent">
            <MailIcon size={22} />
          </span>
          <p className="text-lg font-semibold tracking-tight">Henüz gönderici adresi bağlamadınız</p>
          <p className="max-w-[30rem] text-muted">E-posta kampanyası göndermek için en az bir gönderici adresi bağlayın. Gmail, Google Workspace, Outlook ve her SMTP/IMAP kutusu desteklenir.</p>
          <Button onClick={() => setPanel({ mode: "new" })} disabled={!encryptionReady}>
            <PlusIcon size={16} />
            Gönderici adresi bağla
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-panel bg-surface ring-1 ring-line">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                {["E-posta", "Tür", "Durum", "Sağlık skoru", "Isınma", "Günlük limit", ""].map((h, i) => (
                  <th key={i} scope="col" className="px-4 py-3 font-medium">
                    {h || <span className="sr-only">Eylemler</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => {
                const dns = dnsSummary(m.dnsCheck);
                const score = healthScore(m.dnsCheck);
                const open = openId === m.id;
                return (
                  <Fragment key={m.id}>
                    <tr className="border-t border-line transition-colors first:border-t-0 hover:bg-sunken/40">
                      <td className="max-w-[18rem] px-4 py-3">
                        <span className="block truncate font-medium">{m.email}</span>
                        {m.fromName && <span className="block truncate text-xs text-muted">{m.fromName}</span>}
                        {m.status === "hata" && m.lastError && <span className="block text-xs text-danger">{m.lastError}</span>}
                      </td>
                      <td className="px-4 py-3 text-muted">{providerLabels[m.provider]}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[m.status]}`}>{statusLabel[m.status]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => setOpenId(open ? null : m.id)} aria-expanded={open} className="grid w-32 gap-1 text-left" title="Alan adı sağlığını göster">
                          <span className="h-1.5 overflow-hidden rounded-full bg-sunken">
                            <span className={`block h-full rounded-full ${score === null ? "" : score >= 100 ? "bg-forest" : score >= 75 ? "bg-pollen ring-1 ring-line-strong" : "bg-danger"}`} style={{ width: `${score ?? 0}%` }} />
                          </span>
                          <span className={`text-xs ${dnsStyle[dns.tone]}`}>{score === null ? "Denetlenmedi" : `%${score} · ${dns.label}`}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{m.warmupEnabled ? <span title="Isındırma açık">{m.warmupScore !== null ? `%${m.warmupScore}` : "Başladı"}<span className="block text-xs text-muted">Gün {warmupDay(m.warmupStartedAt)}</span></span> : <span className="text-muted">Kapalı</span>}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {m.dailyLimit} <span className="text-muted">/ gün · {m.hourlyLimit} / saat</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          <button type="button" onClick={() => void test(m)} disabled={busy === `test-${m.id}` || m.status === "duraklatildi"} className="h-8 rounded-full px-3 text-xs font-medium text-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-50">
                            {busy === `test-${m.id}` ? "Gönderiliyor…" : "Test"}
                          </button>
                          <button type="button" onClick={() => setPanel({ mode: "edit", id: m.id })} className="h-8 rounded-full px-3 text-xs font-medium text-muted transition-colors hover:bg-sunken hover:text-ink">
                            Ayarlar
                          </button>
                          <button type="button" onClick={() => void togglePause(m)} className="h-8 rounded-full px-3 text-xs font-medium text-muted transition-colors hover:bg-sunken hover:text-ink">
                            {m.status === "duraklatildi" ? "Sürdür" : "Duraklat"}
                          </button>
                          <button type="button" onClick={() => void remove(m)} aria-label={`${m.email} bağlantısını kaldır`} className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-danger">
                            <TrashIcon size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-t border-line bg-sunken/30">
                        <td colSpan={7} className="px-4 py-4">
                          <h3 className="mb-1 flex items-center gap-2 text-sm font-medium">
                            {dns.tone === "ok" && (
                              <span className="text-accent">
                                <CheckIcon size={16} />
                              </span>
                            )}
                            Alan adı sağlığı (SPF · DKIM · DMARC · MX)
                          </h3>
                          {m.dnsCheck ? (
                            <div className="grid gap-2">
                              <ul className="divide-y divide-line">
                                {m.dnsCheck.checks.map((c) => (
                                  <DnsRow key={c.key} check={c} />
                                ))}
                              </ul>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs text-muted">
                                  Son denetim: {m.dnsCheckedAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(m.dnsCheckedAt)) : "—"}. Kayıtların yayılması birkaç saat sürebilir.
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
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted">
                    Aramaya uyan gönderici adresi yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={panel?.mode === "new"} onClose={() => setPanel(null)} title="Gönderici adresi bağla" width="36rem">
        <MailboxWizard
          googleReady={googleReady}
          onDone={(m) => {
            put(m);
            setPanel(null);
          }}
          onCancel={() => setPanel(null)}
        />
      </Modal>
      <Modal open={panel?.mode === "edit" && Boolean(editing)} onClose={() => setPanel(null)} title="Gönderici adresi ayarları" width="34rem">
        {editing && (
          <MailboxEdit
            key={editing.id}
            mailbox={editing}
            onSaved={(m) => {
              put(m);
              setPanel(null);
            }}
            onCancel={() => setPanel(null)}
          />
        )}
      </Modal>
    </div>
  );
}
