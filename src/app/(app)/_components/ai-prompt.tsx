"use client";

import { useState } from "react";
import { AdspineAiIcon } from "@/components/ui/icons";

/** Adspine AI paneline soru gönderir (panel bu olayı dinler, açılır ve soruyu yanıtlar). */
export const askAssistant = (text: string) => window.dispatchEvent(new CustomEvent("adspine-ai", { detail: { text } }));

const chips = ["Bugün neye odaklanmalıyım?", "Otomasyonlarım nasıl gidiyor?", "Hangi gönderici adresim sorunlu?"];

/** Ana sayfadaki soru çubuğu: yazılan soru sağdaki Adspine AI panelinde yanıtlanır. */
export function AiPrompt() {
  const [text, setText] = useState("");
  const send = (t: string) => {
    if (!t.trim()) return;
    askAssistant(t.trim());
    setText("");
  };
  return (
    <div className="grid gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="flex h-14 items-center gap-3 rounded-panel bg-surface pr-2 pl-4 ring-1 ring-line-strong transition-shadow focus-within:ring-2 focus-within:ring-forest sm:pl-5"
      >
        <AdspineAiIcon size={26} />
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} aria-label="Adspine AI'ya sorun" placeholder="Adspine AI'ya sorun: otomasyonlarım, adreslerim, ne yapmalıyım…" className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted" />
        <button type="submit" disabled={!text.trim()} className="h-10 shrink-0 rounded-control bg-forest px-5 text-sm font-medium text-white transition-colors hover:bg-forest-hover disabled:opacity-40">
          Sor
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-sm text-muted">Deneyin:</span>
        {chips.map((c) => (
          <button key={c} type="button" onClick={() => send(c)} className="rounded-full bg-surface px-3.5 py-1.5 text-sm text-muted ring-1 ring-line transition-colors hover:bg-sunken hover:text-ink">
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
