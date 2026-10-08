"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "../panel/(automation)/kisiler/_components/contact-ui";

type Turn = { role: "user" | "assistant"; content: string; links?: { path: string; label: string }[] };

const suggestions = ["Otomasyonlarım nasıl gidiyor?", "Geri dönen oranım neden önemli?", "Hangi gönderici adresim sorunlu?", "Yeni bir otomasyon için nereden başlamalıyım?"];

/** Yapay zekâ simgesi: büyük ve küçük parıltı, marka mavisi geçişli. */
function AiIcon({ size = 20, id }: { size?: number; id: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5aa9ff" />
          <stop offset="1" stopColor="#0072e5" />
        </linearGradient>
      </defs>
      <path d="M10 2.5c.5 4.4 2.6 6.5 7 7-4.4.5-6.5 2.6-7 7-.5-4.4-2.6-6.5-7-7 4.4-.5 6.5-2.6 7-7Z" fill={`url(#${id})`} />
      <path d="M18.5 14c.25 2.2 1.3 3.25 3.5 3.5-2.2.25-3.25 1.3-3.5 3.5-.25-2.2-1.3-3.25-3.5-3.5 2.2-.25 3.25-1.3 3.5-3.5Z" fill={`url(#${id})`} />
    </svg>
  );
}

/**
 * Sağdan açılan yapay zekâ yardımcısı. Kullanıcının kendi rakamlarına dayanarak sorulara yanıt verir ve ilgili sayfaya
 * yönlendirir. Sohbet yalnızca bu oturumda tarayıcıda tutulur.
 */
export function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [turns, busy, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const latest = useRef<(q: string) => Promise<void>>(async () => {});

  // Sayfalardaki "Adspine AI'ya sor" çubuğu paneli açar ve soruyu gönderir.
  useEffect(() => {
    const onAsk = (e: Event) => {
      const t = (e as CustomEvent<{ text: string }>).detail?.text;
      if (!t) return;
      setOpen(true);
      void latest.current(t);
    };
    window.addEventListener("adspine-ai", onAsk);
    return () => window.removeEventListener("adspine-ai", onAsk);
  }, []);

  async function ask(q: string) {
    const content = q.trim();
    if (!content || busy) return;
    const next: Turn[] = [...turns, { role: "user", content }];
    setTurns(next);
    setText("");
    if (box.current) box.current.style.height = "auto";
    setError("");
    setBusy(true);
    const r = await api<{ reply: string; links: { path: string; label: string }[] }>("/api/outreach/assistant", {
      method: "POST",
      body: JSON.stringify({ messages: next.map(({ role, content: c }) => ({ role, content: c })) }),
    });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setTurns([...next, { role: "assistant", content: r.data.reply, links: r.data.links }]);
  }

  useEffect(() => {
    latest.current = ask;
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="assistant-panel"
        aria-label="Adspine AI"
        title="Adspine AI"
        className="fixed right-4 bottom-20 z-40 grid size-12 place-items-center rounded-full bg-surface shadow-float ring-1 ring-line transition-transform hover:-translate-y-0.5 md:bottom-6"
      >
        <AiIcon id="ai-fab" size={26} />
      </button>

      <section
        id="assistant-panel"
        aria-label="Adspine AI"
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[26rem] flex-col border-l border-line bg-paper shadow-xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="flex items-center gap-2 font-semibold tracking-tight">
            <AiIcon id="ai-head" size={20} />
            Adspine AI
          </h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Kapat" className="grid size-9 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink">
            <span aria-hidden="true" className="text-xl leading-none">
              ×
            </span>
          </button>
        </header>

        <div className="grid flex-1 content-start gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
          {turns.length === 0 && (
            <div className="grid gap-3">
              <p className="text-sm text-muted">Son 30 günlük otomasyon, gönderici adresi ve kredi rakamlarınıza bakarak sorularınızı yanıtlarım. Rakamınız olmayan bir şeyi uydurmam.</p>
              <div className="grid gap-2">
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => void ask(s)} className="rounded-control px-3 py-2 text-left text-sm ring-1 ring-line transition-colors hover:bg-sunken">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {turns.map((t, i) => (
            <div key={i} className={t.role === "user" ? "justify-self-end" : "justify-self-start"}>
              <p className={`max-w-[22rem] rounded-panel px-3.5 py-2.5 text-sm whitespace-pre-wrap ${t.role === "user" ? "bg-forest text-white" : "bg-sunken"}`}>{t.content}</p>
              {t.links && t.links.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {t.links.map((l) => (
                    <Link key={l.path} href={l.path} onClick={() => setOpen(false)} className="text-sm text-accent underline underline-offset-4 hover:no-underline">
                      {l.label} →
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          {busy && <p className="justify-self-start rounded-panel bg-sunken px-3.5 py-2.5 text-sm text-muted">Düşünüyor…</p>}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div ref={end} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(text);
          }}
          className="flex items-end gap-2 border-t border-line p-3"
        >
          <textarea
            ref={box}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              // Yazdıkça yükselir (en çok 8rem); tek satırda düğmeyle aynı yükseklikte kalır.
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(text);
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder="Bir şey sorun…"
            aria-label="Mesajınız"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-control bg-surface px-3 py-[0.6875rem] text-sm leading-5 ring-1 ring-line outline-none focus:ring-2 focus:ring-forest"
          />
          <Button type="submit" disabled={busy || !text.trim()} className="h-11">
            Gönder
          </Button>
        </form>
      </section>
    </>
  );
}
