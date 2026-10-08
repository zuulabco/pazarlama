"use client";

import { useState } from "react";
import { ActionLink } from "@/components/ui/action-link";
import { ChatIcon, CheckIcon, CopyIcon, MailIcon } from "@/components/ui/icons";
import { toast } from "@/components/ui/toast";
import { gmailHref, mailtoHref, parseRecipient, whatsappHref, type Draft, type WorkFirm, type WorkKind } from "@/modules/work/context";

const kindLabel: Record<WorkKind, string> = { message: "WhatsApp / DM mesajı", email: "E-posta" };

/**
 * Gönderim kutusu: alıcı kutusuna e-posta yazılırsa Gmail ya da e-posta uygulaması, telefon yazılırsa WhatsApp
 * açılır; metin hazır dolu gelir. Takipten bir firma seçildiyse adresi/numarası hazır yazılıdır ve "Gönderdim"
 * Takip'e not düşer.
 */
export function SendBox({ kind, draft, firm }: { kind: WorkKind; draft: Draft; firm: WorkFirm | null }) {
  const [text, setText] = useState(() => (kind === "email" ? (firm?.email ?? firm?.phone) : (firm?.phone ?? firm?.email)) ?? "");
  const [sent, setSent] = useState(false);

  const recipient = parseRecipient(text);
  const invalid = recipient?.type === "invalid";
  const full = draft.subject ? `Konu: ${draft.subject}\n\n${draft.body}` : draft.body;

  const links =
    recipient?.type === "email"
      ? { gmail: gmailHref(recipient.email, draft.subject, draft.body), mail: mailtoHref(recipient.email, draft.subject, draft.body) }
      : null;
  const wa = recipient?.type === "phone" ? whatsappHref(recipient.phone, draft.body) : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(full);
      toast("Mesaj kopyalandı");
    } catch {
      toast("Kopyalanamadı. Metni seçip elle kopyalayın.", { kind: "error" });
    }
  }

  async function markSent() {
    if (!firm?.id) return;
    try {
      const note = `${kindLabel[kind]} gönderildi: "${draft.body.replace(/\s+/g, " ").slice(0, 150)}${draft.body.length > 150 ? "…" : ""}"`;
      const noted = await fetch(`/api/favorites/${firm.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: note }),
      });
      if (!noted.ok) throw new Error("Takip'e işlenemedi. Tekrar deneyin.");
      if (firm.status === "takipte") {
        await fetch(`/api/favorites/${firm.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "iletisim" }),
        });
      }
      setSent(true);
      toast("Takip'e işlendi", { action: { label: "Takip listesi", href: "/panel/firmalar" } });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Takip'e işlenemedi. Tekrar deneyin.", { kind: "error" });
    }
  }

  return (
    <div className="grid gap-4 rounded-row bg-sunken/60 p-4 sm:p-5">
      <div className="grid gap-2">
        <label htmlFor="send-recipient" className="text-sm font-medium">
          Nereye gönderelim?
          <span className="mt-0.5 block text-sm font-normal text-muted">E-posta adresi yazarsanız e-postada, telefon numarası yazarsanız WhatsApp&apos;ta açılır.</span>
        </label>
        <input
          id="send-recipient"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSent(false);
          }}
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={120}
          placeholder="ornek@firma.com ya da 0532 000 00 00"
          aria-invalid={invalid ? true : undefined}
          aria-describedby={invalid ? "send-recipient-error" : undefined}
          className="h-11 rounded-control bg-surface px-3.5 ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest aria-invalid:ring-danger"
        />
        {invalid && (
          <p id="send-recipient-error" role="alert" className="text-sm text-danger">
            Geçerli bir e-posta adresi ya da telefon numarası yazın.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {links && (
          <>
            <ActionLink href={links.gmail} external icon={<MailIcon />} label="Gmail'de aç" />
            <ActionLink href={links.mail} icon={<MailIcon />} label="E-posta uygulamasında aç" />
          </>
        )}
        {wa && <ActionLink href={wa} external icon={<ChatIcon />} label="WhatsApp'ta aç" />}
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium ring-1 ring-line-strong ring-inset transition-colors hover:bg-forest-soft hover:text-accent"
        >
          <CopyIcon />
          Kopyala
        </button>
        {firm?.id && (
          <button
            type="button"
            onClick={markSent}
            disabled={sent}
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-full bg-forest px-4 text-sm font-medium text-white transition-colors hover:bg-forest-hover disabled:opacity-60"
          >
            <CheckIcon />
            {sent ? "Takip'e işlendi" : "Gönderdim"}
          </button>
        )}
      </div>

      {kind === "email" && (
        <p className="text-xs text-muted">
          E-postanın sonuna alıcıya çıkış hakkı veren bir satır eklenir. Ticari ileti göndermeden önce ilgili mevzuata uygunluk sizin sorumluluğunuzdadır.
        </p>
      )}
    </div>
  );
}
