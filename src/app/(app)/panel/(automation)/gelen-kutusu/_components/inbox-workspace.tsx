"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, SearchIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/select";
import { Toaster, toast } from "@/components/ui/toast";
import { leadStatuses, statusLabel, type Conversation, type InboxCounts, type LeadStatus, type ThreadMessage } from "@/modules/outreach/unibox-options";
import { api } from "../../kisiler/_components/contact-ui";

type Option = { id: string; label: string };
type Data = { conversations: Conversation[]; counts: InboxCounts };

const num = (n: number) => new Intl.NumberFormat("tr-TR").format(n);

const when = (iso: string) => {
  const d = new Date(iso);
  const same = new Date().toDateString() === d.toDateString();
  return same ? new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(d) : new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(d);
};
const full = (iso: string) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

const who = (c: Conversation["contact"]) => c.name ?? c.company ?? c.email ?? "Kişi";
const initials = (s: string) => s.trim().slice(0, 2).toLocaleUpperCase("tr");

const statusTone: Record<LeadStatus, string> = {
  lead: "bg-sunken text-muted",
  ilgili: "bg-forest-soft text-accent",
  toplanti: "bg-forest-soft text-accent",
  toplanti_yapildi: "bg-forest-soft text-accent",
  kazanildi: "bg-forest text-white",
  ofis_disi: "bg-pollen text-ink",
  yanlis_kisi: "bg-sunken text-muted",
  ilgisiz: "bg-danger-soft text-danger",
  kaybedildi: "bg-danger-soft text-danger",
};

/**
 * Gelen kutusu (Instantly Unibox yapısı): solda durum etiketleri ve süzgeçler, ortada konuşmalar, sağda konuşma ve yanıt kutusu.
 * Yanıtlar gelince otomatik etiketlenir; etiketi değiştirebilir ve yanıt yazabilirsiniz.
 */
export function InboxWorkspace({ initial, campaigns, mailboxes }: { initial: Data; campaigns: Option[]; mailboxes: Option[] }) {
  const [data, setData] = useState(initial);
  const [status, setStatus] = useState<LeadStatus | "hepsi">("hepsi");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [campaign, setCampaign] = useState("");
  const [mailbox, setMailbox] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<{ conversation: Conversation; messages: ThreadMessage[] } | null>(null);
  const [threadBusy, setThreadBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const seq = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);

  const query = useCallback(() => {
    const p = new URLSearchParams({ status, unread: unreadOnly ? "1" : "0" });
    if (campaign) p.set("campaign", campaign);
    if (mailbox) p.set("mailbox", mailbox);
    if (q.trim()) p.set("q", q.trim());
    return p.toString();
  }, [status, unreadOnly, campaign, mailbox, q]);

  /** Listeyi yeniler; sıra bozulursa eski yanıt atılır. */
  const refresh = useCallback(async () => {
    const mine = ++seq.current;
    const r = await api<Data>(`/api/outreach/inbox?${query()}`);
    if (mine === seq.current && r.ok) setData(r.data);
  }, [query]);

  // Süzgeç değişince (yazarken kısa gecikmeyle) ve her 45 saniyede yeni yanıtlar için yenile.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (status === "hepsi" && !unreadOnly && !campaign && !mailbox && !q) return;
    }
    const t = setTimeout(() => void refresh(), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [refresh, status, unreadOnly, campaign, mailbox, q]);
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && void refresh(), 45_000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages.length, selected]);

  async function open(id: string) {
    setSelected(id);
    setThreadBusy(true);
    setReply("");
    const r = await api<{ conversation: Conversation; messages: ThreadMessage[] }>(`/api/outreach/inbox/${id}`);
    setThreadBusy(false);
    if (!r.ok) return toast(r.error, { kind: "error" });
    setThread(r.data);
    setData((d) => ({ ...d, conversations: d.conversations.map((c) => (c.id === id ? { ...c, unread: false } : c)), counts: { ...d.counts, okunmamis: Math.max(d.counts.okunmamis - (d.conversations.find((c) => c.id === id)?.unread ? 1 : 0), 0) } }));
  }

  async function changeStatus(id: string, next: LeadStatus) {
    const r = await api(`/api/outreach/inbox/${id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    if (!r.ok) return toast(r.error, { kind: "error" });
    setThread((t) => (t ? { ...t, conversation: { ...t.conversation, status: next } } : t));
    toast(`Durum: ${statusLabel(next)}`);
    void refresh();
  }

  async function send() {
    if (!selected || !reply.trim() || sending) return;
    setSending(true);
    const r = await api<{ message: ThreadMessage }>(`/api/outreach/inbox/${selected}/reply`, { method: "POST", body: JSON.stringify({ body: reply }) });
    setSending(false);
    if (!r.ok) return toast(r.error, { kind: "error" });
    setThread((t) => (t ? { ...t, messages: [...t.messages, r.data.message] } : t));
    setReply("");
    toast("Yanıt gönderildi");
  }

  const { conversations, counts } = data;
  const pane = "min-h-0 overflow-y-auto";

  return (
    <div className="grid h-[calc(100svh-6.5rem)] min-h-[32rem] gap-4 lg:grid-cols-[13rem_minmax(0,21rem)_minmax(0,1fr)]">
      <Toaster />

      {/* Durum etiketleri ve süzgeçler */}
      <aside aria-label="Durumlar" className={`${pane} ${selected ? "hidden lg:block" : ""} grid content-start gap-4`}>
        <ul className="grid gap-0.5" aria-label="Durum">
          {[{ value: "hepsi" as const, label: "Tüm yanıtlar", n: counts.toplam }, ...leadStatuses.map((s) => ({ value: s.value, label: s.label, n: counts[s.value] }))].map((s) => (
            <li key={s.value}>
              <button
                type="button"
                aria-pressed={status === s.value}
                onClick={() => setStatus(s.value)}
                className="flex w-full items-center justify-between gap-2 rounded-control px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-sunken hover:text-ink aria-pressed:bg-forest-soft aria-pressed:font-medium aria-pressed:text-accent"
              >
                <span className="truncate">{s.label}</span>
                {s.n > 0 && <span className="text-xs tabular-nums">{num(s.n)}</span>}
              </button>
            </li>
          ))}
        </ul>
        <label className="flex cursor-pointer items-center justify-between gap-2 rounded-control px-3 py-2 text-sm">
          <span>Yalnızca okunmamış{counts.okunmamis > 0 ? ` (${num(counts.okunmamis)})` : ""}</span>
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} className="size-4 accent-[var(--color-forest)]" />
        </label>
        <div className="grid gap-2 px-1">
          <Select<string> label="Kampanya" value={campaign} options={[{ value: "", label: "Tüm kampanyalar" }, ...campaigns.map((c) => ({ value: c.id, label: c.label }))]} onChange={setCampaign} />
          <Select<string> label="Gönderici adresi" value={mailbox} options={[{ value: "", label: "Tüm gönderici adresleri" }, ...mailboxes.map((m) => ({ value: m.id, label: m.label }))]} onChange={setMailbox} />
        </div>
      </aside>

      {/* Konuşmalar */}
      <section aria-label="Konuşmalar" className={`${selected ? "hidden lg:flex" : "flex"} min-h-0 flex-col overflow-hidden rounded-panel bg-surface ring-1 ring-line`}>
        <label className="relative block border-b border-line p-3">
          <span className="sr-only">Konuşma ara</span>
          <span className="pointer-events-none absolute top-1/2 left-6 -translate-y-1/2 text-muted">
            <SearchIcon size={15} />
          </span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, firma ya da e-posta ara" className="h-10 w-full rounded-control bg-sunken pr-3 pl-9 outline-none placeholder:text-muted focus:ring-2 focus:ring-forest" />
        </label>
        <ul className={`${pane} divide-y divide-line`}>
          {conversations.length === 0 && (
            <li className="grid justify-items-center gap-2 px-6 py-16 text-center">
              <p className="font-semibold">{counts.toplam === 0 ? "Gelen kutunuz boş" : "Süzgeçe uyan konuşma yok"}</p>
              <p className="max-w-[16rem] text-sm text-muted">{counts.toplam === 0 ? "Kampanya e-postalarınıza gelen yanıtlar burada toplanır; her 5 dakikada bir kontrol edilir." : "Süzgeçleri gevşetmeyi deneyin."}</p>
              {counts.toplam === 0 && (
                <Link href="/panel/kampanyalar" className="text-sm text-accent underline underline-offset-4 hover:no-underline">
                  Kampanyalara git
                </Link>
              )}
            </li>
          )}
          {conversations.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => void open(c.id)} aria-current={selected === c.id ? "true" : undefined} className="grid w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken/60 aria-[current=true]:bg-forest-soft/60">
                <span className="grid size-9 place-items-center rounded-full bg-sunken text-xs font-semibold">{initials(who(c.contact))}</span>
                <span className="grid min-w-0 gap-0.5">
                  <span className={`truncate text-sm ${c.unread ? "font-semibold" : "font-medium"}`}>{who(c.contact)}</span>
                  <span className="truncate text-xs text-muted">{c.contact.company && c.contact.name ? c.contact.company : (c.campaign.name ?? "")}</span>
                  <span className={`truncate text-sm ${c.unread ? "text-ink" : "text-muted"}`}>{c.snippet || c.subject || "(boş yanıt)"}</span>
                  <span className={`mt-1 w-fit rounded-full px-2 py-0.5 text-xs font-medium ${statusTone[c.status]}`}>{statusLabel(c.status)}</span>
                </span>
                <span className="flex flex-col items-end gap-1.5">
                  <span className="text-xs text-muted tabular-nums">{when(c.lastReplyAt)}</span>
                  {c.unread && <span aria-label="Okunmamış" className="size-2 rounded-full bg-forest" />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Konuşma */}
      <section aria-label="Konuşma" className={`${selected ? "flex" : "hidden lg:flex"} min-h-0 flex-col overflow-hidden rounded-panel bg-surface ring-1 ring-line`}>
        {!selected || (!thread && !threadBusy) ? (
          <div className="grid flex-1 place-items-center px-6 text-center">
            <div className="grid max-w-[18rem] gap-1">
              <p className="font-semibold">Bir konuşma seçin</p>
              <p className="text-sm text-muted">Soldaki listeden bir yanıt seçin; konuşmayı görür, durumunu değiştirir ve yanıt yazarsınız.</p>
            </div>
          </div>
        ) : !thread ? (
          <div className="grid flex-1 place-items-center text-sm text-muted">Yükleniyor…</div>
        ) : (
          <>
            <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
              <button type="button" onClick={() => setSelected(null)} aria-label="Listeye dön" className="grid size-8 place-items-center rounded-full text-muted hover:bg-sunken lg:hidden">
                <ArrowLeftIcon size={16} />
              </button>
              <div className="grid min-w-0 flex-1 gap-0.5">
                <h2 className="truncate text-sm font-semibold">{who(thread.conversation.contact)}</h2>
                <p className="truncate text-xs text-muted">
                  {[thread.conversation.contact.company, thread.conversation.contact.email, thread.conversation.campaign.name].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="w-48">
                <Select<LeadStatus> label="Durum" value={thread.conversation.status} options={leadStatuses.map((s) => ({ value: s.value, label: s.label }))} onChange={(v) => void changeStatus(thread.conversation.id, v)} align="right" />
              </div>
            </header>

            <div className={`${pane} flex-1 px-4 py-4`}>
              <ol className="grid gap-4">
                {thread.messages.map((m) => (
                  <li key={m.id} className={`grid max-w-[85%] gap-1 ${m.direction === "giden" ? "justify-self-end" : "justify-self-start"}`}>
                    <div className={`flex items-baseline gap-2 text-xs text-muted ${m.direction === "giden" ? "justify-end" : ""}`}>
                      <span className="truncate font-medium text-ink">{m.direction === "giden" ? (m.kind === "kampanya" ? "Kampanya" : "Siz") : m.from}</span>
                      <span className="tabular-nums">{full(m.at)}</span>
                      {m.kind === "ooo" && <span className="rounded-full bg-pollen px-2 py-0.5 text-ink">Ofis dışı</span>}
                    </div>
                    <div className={`rounded-row px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${m.direction === "giden" ? "bg-forest-soft" : "bg-sunken"}`}>
                      {m.subject && <p className="mb-1.5 font-medium">{m.subject}</p>}
                      {m.body || "(boş ileti)"}
                    </div>
                  </li>
                ))}
              </ol>
              <div ref={bottom} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              className="grid gap-2 border-t border-line p-3"
            >
              <label className="sr-only" htmlFor="yanit-kutusu">
                Yanıtınız
              </label>
              <textarea
                id="yanit-kutusu"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void send();
                }}
                rows={4}
                maxLength={10000}
                placeholder="Yanıtınızı yazın…"
                className="w-full resize-y rounded-row bg-sunken px-3.5 py-3 leading-relaxed outline-none placeholder:text-muted focus:ring-2 focus:ring-forest"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted">İmzanız otomatik eklenir · Ctrl+Enter ile gönderin</span>
                <Button type="submit" disabled={sending || !reply.trim()}>
                  {sending ? "Gönderiliyor…" : "Yanıtla"}
                </Button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
