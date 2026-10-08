"use client";

import { useState } from "react";

/** Adspine AI paneline soru gönderir (panel bu olayı dinler, açılır ve soruyu yanıtlar). */
export const askAssistant = (text: string) => window.dispatchEvent(new CustomEvent("adspine-ai", { detail: { text } }));

const chips = ["Bugün neye odaklanmalıyım?", "Kampanyalarım nasıl gidiyor?", "Hangi gönderici adresim sorunlu?"];

/** Ana sayfadaki soru çubuğu: yazılan soru sağdaki Adspine AI panelinde yanıtlanır. */
export function AiPrompt() {
  const [text, setText] = useState("");
  const send = (t: string) => {
    if (!t.trim()) return;
    askAssistant(t.trim());
    setText("");
  };
  return (
    <div className="rounded-panel bg-surface p-4 ring-1 ring-line">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="flex items-center gap-3"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="shrink-0">
          <defs>
            <linearGradient id="ai-home" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
              <stop stopColor="#5aa9ff" />
              <stop offset="1" stopColor="#0072e5" />
            </linearGradient>
          </defs>
          <path d="M10 2.5c.5 4.4 2.6 6.5 7 7-4.4.5-6.5 2.6-7 7-.5-4.4-2.6-6.5-7-7 4.4-.5 6.5-2.6 7-7Z" fill="url(#ai-home)" />
          <path d="M18.5 14c.25 2.2 1.3 3.25 3.5 3.5-2.2.25-3.25 1.3-3.5 3.5-.25-2.2-1.3-3.25-3.5-3.5 2.2-.25 3.25-1.3 3.5-3.5Z" fill="url(#ai-home)" />
        </svg>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} aria-label="Adspine AI'ya sorun" placeholder="Adspine AI'ya sorun: kampanyalarım, adreslerim, ne yapmalıyım…" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" />
        <button type="submit" disabled={!text.trim()} className="h-9 shrink-0 rounded-control bg-forest px-4 text-sm font-medium text-white transition-colors hover:bg-forest-hover disabled:opacity-50">
          Sor
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button key={c} type="button" onClick={() => send(c)} className="rounded-full px-3 py-1 text-sm text-muted ring-1 ring-line transition-colors hover:bg-sunken hover:text-ink">
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
