"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapse } from "@/components/ui/collapse";
import { FlameIcon } from "@/components/ui/icons";
import { toast } from "@/components/ui/toast";
import type { Mailbox } from "@/modules/outreach/mailbox-schema";
import type { WarmupOverview } from "@/modules/outreach/warmup";
import { warmupRamp } from "@/modules/outreach/warmup-rules";
import { api } from "../../kisiler/_components/contact-ui";

const ramp = warmupRamp();
const rampLabel = (r: (typeof ramp)[number]) => (r.to === null ? `${r.from}+` : r.from === r.to ? `${r.from}` : `${r.from}-${r.to}`);

type Status = { tone: "ok" | "wait" | "warn"; text: string };

/** Isındırmanın şu an ne yaptığını tek cümleyle söyler; kullanıcı "çalışıyor mu?" diye merak etmesin. */
function statusOf(s: WarmupOverview): Status {
  if (s.peers === 0) return { tone: "warn", text: "Havuzda sizden başka açık adres yok. Bir eş katılınca e-postalar kendiliğinden başlar." };
  if (!s.inWindow) return { tone: "wait", text: "Şu an gönderim saati dışında. E-postalar 08:30-20:30 arasında (İstanbul saati) gider." };
  if (s.sentToday >= s.quota) return { tone: "ok", text: "Bugünkü kota tamam. Yarın devam eder." };
  return { tone: "ok", text: "Çalışıyor. Bugünkü e-postalar gün içine yayılarak gönderilir." };
}

const toneStyle = { ok: "bg-forest-soft text-accent", wait: "bg-sunken text-muted", warn: "bg-pollen/50 text-ink" } as const;

function ago(iso: string | null): string {
  if (!iso) return "Henüz yok";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** Isındırma penceresi: kapalıyken açıklama + onay + başlat; açıkken canlı durum, sonuçlar, kademe ve durdur. */
export function WarmupModal({ mailbox, onChange, onClose }: { mailbox: Mailbox; onChange: (m: Mailbox) => void; onClose: () => void }) {
  const on = mailbox.warmupEnabled;
  const [stats, setStats] = useState<WarmupOverview | null>(null);
  const [consent, setConsent] = useState(Boolean(mailbox.warmupConsentAt));
  const [busy, setBusy] = useState<"start" | "stop" | "now" | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!on) return;
    let live = true;
    void api<{ stats: WarmupOverview }>(`/api/outreach/mailboxes/${mailbox.id}/warmup`).then((r) => live && r.ok && setStats(r.data.stats));
    return () => {
      live = false;
    };
  }, [mailbox.id, on]);

  async function sendNow() {
    const r = await api<{ first: { result: "sent" | "alone" | "limit" | "error"; message: string }; stats: WarmupOverview }>(`/api/outreach/mailboxes/${mailbox.id}/warmup`, { method: "POST" });
    if (!r.ok) {
      setNote({ ok: false, text: r.error });
      return;
    }
    setStats(r.data.stats);
    setNote({ ok: r.data.first.result === "sent" || r.data.first.result === "alone" || r.data.first.result === "limit", text: r.data.first.message });
  }

  async function start() {
    if (busy) return;
    setBusy("start");
    setNote(null);
    const r = await api<{ mailbox: Mailbox }>(`/api/outreach/mailboxes/${mailbox.id}`, { method: "PATCH", body: JSON.stringify({ warmupEnabled: true, warmupConsent: consent }) });
    if (!r.ok) {
      setBusy(null);
      return toast(r.error, { kind: "error" });
    }
    onChange(r.data.mailbox);
    toast("Isındırma başladı");
    await sendNow();
    setBusy(null);
  }

  async function stop() {
    if (busy) return;
    setBusy("stop");
    const r = await api<{ mailbox: Mailbox }>(`/api/outreach/mailboxes/${mailbox.id}`, { method: "PATCH", body: JSON.stringify({ warmupEnabled: false }) });
    setBusy(null);
    if (!r.ok) return toast(r.error, { kind: "error" });
    setStats(null);
    setNote(null);
    onChange(r.data.mailbox);
    toast("Isındırma durduruldu");
  }

  const status = stats ? statusOf(stats) : null;
  const day = stats ? stats.days + 1 : 1;
  const needConsent = !on && !mailbox.warmupConsentAt && !consent;

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${on ? "bg-forest-soft text-accent" : "bg-sunken text-muted"}`}>
          <FlameIcon size={20} filled={on} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{mailbox.email}</p>
          <p className="text-sm text-muted">{on ? `Isınıyor · ${day}. gün` : "Isındırma kapalı"}</p>
        </div>
      </div>

      <p className="text-sm text-muted">
        Yeni ya da az kullanılan bir adres birden çok e-posta yollarsa spam&apos;e düşer. Isındırma, havuzdaki diğer adreslerle kısa ve doğal yazışmalar yaparak adresinize güven kazandırır; sayı her gün yavaşça artar.
      </p>

      <section aria-label="Kademe" className="grid gap-2">
        <h3 className="text-sm font-medium">Günlük ısındırma e-postası</h3>
        <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ramp.map((r) => {
            const current = on && day >= r.from && (r.to === null || day <= r.to);
            return (
              <li key={r.from} className={`grid gap-0.5 rounded-row px-3 py-2 text-center ring-1 ring-inset ${current ? "bg-forest-soft ring-forest" : "ring-line"}`}>
                <span className={`text-base font-semibold tabular-nums ${current ? "text-accent" : ""}`}>{r.quota}</span>
                <span className="text-xs text-muted">{rampLabel(r)}. gün</span>
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-muted">Otomasyon e-postalarınız da bu sürede kademeli artar; hedef limitinize ulaşınca ısınma tamamlanır.</p>
      </section>

      {on ? (
        <>
          {status ? (
            <p role="status" className={`rounded-row px-4 py-3 text-sm ${toneStyle[status.tone]}`}>
              {status.text}
            </p>
          ) : (
            <div className="h-11 animate-pulse rounded-row bg-sunken" aria-hidden="true" />
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            {[
              ["Bugün", stats ? `${stats.sentToday} / ${stats.quota}` : "—"],
              ["Skor", stats ? (stats.score === null ? "Veri toplanıyor" : `%${stats.score}`) : "—"],
              ["Son gönderim", stats ? ago(stats.lastSentAt) : "—"],
              ["Gelen kutusuna ulaşan", stats ? String(stats.inbox) : "—"],
              ["Spam'e düşen", stats ? String(stats.spam) : "—"],
              ["Yanıtlanan", stats ? String(stats.replied) : "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="font-medium tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          {stats && stats.score === null && <p className="-mt-2 text-xs text-muted">Skor için en az 5 e-postanın sonucu gerekir.</p>}

          {note && (
            <p role={note.ok ? "status" : "alert"} className={`rounded-row px-4 py-3 text-sm ${note.ok ? "bg-sunken" : "bg-danger-soft text-danger"}`}>
              {note.text}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              disabled={busy !== null}
              onClick={() => {
                setBusy("now");
                setNote(null);
                void sendNow().then(() => setBusy(null));
              }}
            >
              {busy === "now" ? "Gönderiliyor…" : "Şimdi bir e-posta gönder"}
            </Button>
            <Button variant="quiet" disabled={busy !== null} onClick={() => void stop()}>
              {busy === "stop" ? "Durduruluyor…" : "Isındırmayı durdur"}
            </Button>
            <Button variant="quiet" className="ml-auto" onClick={onClose}>
              Kapat
            </Button>
          </div>
        </>
      ) : (
        <>
          <Collapse open={!mailbox.warmupConsentAt}>
            <label className="flex items-start gap-3 rounded-row bg-sunken/60 p-3.5 text-sm">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--color-forest)]" />
              <span>Isındırma havuzuna katılıyorum: bu adres, havuzdaki diğer Adspine kullanıcılarının adresleriyle kısa ve zararsız e-postalar alıp verecek; o adreslerin sahipleri adresimi görebilir.</span>
            </label>
          </Collapse>
          {note && (
            <p role={note.ok ? "status" : "alert"} className={`rounded-row px-4 py-3 text-sm ${note.ok ? "bg-sunken" : "bg-danger-soft text-danger"}`}>
              {note.text}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={busy !== null || needConsent} onClick={() => void start()}>
              <FlameIcon size={16} />
              {busy === "start" ? "Başlatılıyor…" : mailbox.warmupStartedAt ? "Isındırmayı sürdür" : "Isındırmayı başlat"}
            </Button>
            <Button variant="quiet" onClick={onClose} disabled={busy !== null}>
              Vazgeç
            </Button>
          </div>
          {mailbox.provider === "google" && <p className="-mt-2 text-xs text-muted">Google ile bağlı adreslerde spam&apos;e düşen iletiler ölçülür ama gelen kutusuna taşınamaz.</p>}
        </>
      )}
    </div>
  );
}
