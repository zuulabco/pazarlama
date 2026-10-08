import type { Mailbox } from "./mailbox-schema";
import type { Sequence } from "./sequence-schema";

/** Kampanyayı başlatmadan önceki denetimler (saf): eksikler kullanıcıya tek tek, düzeltilebilir biçimde söylenir. */

export type Problem = { code: "adim" | "bos_mesaj" | "posta_kutusu" | "alan_adi"; message: string; /** Kullanıcı bilerek geçebilir mi? */ overridable: boolean };

export function activationProblems(seq: Pick<Sequence, "steps" | "settings">, mailboxes: Mailbox[]): Problem[] {
  const problems: Problem[] = [];
  const active = seq.steps.filter((s) => s.enabled);
  if (active.length === 0) problems.push({ code: "adim", message: "Kampanyada etkin adım yok. En az bir adım ekleyin.", overridable: false });

  // Takip adımlarında konu boş olabilir (önceki konuya "Re:" ile bağlanır); ilk e-posta adımında konu ve mesaj şarttır.
  const firstEmail = active.findIndex((s) => s.kind === "email");
  active.forEach((s, i) => {
    if (s.kind !== "email") return;
    const ok = s.variants.some((v) => v.body.trim() && (i !== firstEmail || v.subject.trim()));
    if (!ok) problems.push({ code: "bos_mesaj", message: `${i + 1}. adımın ${i === firstEmail ? "konusu ya da " : ""}mesajı boş.`, overridable: false });
  });

  if (firstEmail >= 0) {
    const allowed = mailboxes.filter((m) => seq.settings.mailboxIds.length === 0 || seq.settings.mailboxIds.includes(m.id));
    const usable = allowed.filter((m) => m.status === "bagli");
    if (usable.length === 0) {
      problems.push({ code: "posta_kutusu", message: "Gönderim için bağlı bir gönderici adresi yok. Gönderici adresleri sayfasından bağlayın.", overridable: false });
    } else {
      // DMARC tek başına engel değil (önerilir); SPF/DKIM/MX eksikse geçilebilir uyarı verilir.
      const blocking = (m: Mailbox) => (m.dnsCheck?.checks ?? []).filter((c) => c.status !== "ok" && c.key !== "dmarc");
      const needsFix = (m: Mailbox) => !m.dnsCheck || (!m.dnsCheck.ready && blocking(m).length > 0);
      if (usable.every(needsFix)) {
        const bad = blocking(usable[0]).map((c) => c.title).join(", ");
        problems.push({
          code: "alan_adi",
          message: `Alan adı ayarları tamam değil${bad ? ` (${bad})` : ""}. Gmail ve Yahoo, SPF/DKIM olmayan alan adlarından gelen toplu e-postaları sık sık reddeder.`,
          overridable: true,
        });
      }
    }
  }
  return problems;
}
