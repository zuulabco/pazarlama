import type { OutgoingMail } from "./smtp";

/** Giden e-posta gövdesi, imza, abonelik alt bilgisi ve başlıkları (saf; `smtp.ts`'e bağımlı olmayan tür hariç). */

export type BuildInput = {
  fromName: string | null;
  fromEmail: string;
  to: string;
  subject: string;
  body: string;
  /** Gönderici adresinin imzası; `includeSignature` açıksa eklenir. */
  signature: string;
  includeSignature: boolean;
  /** Alt bilgide görünen gönderici kimliği: "Elif Yıldız · Yıldız Mali Müşavirlik · adres". Ticari iletide zorunludur. */
  identity: string;
  /** Alt bilgide görünen, insanlar için abonelikten çıkma sayfası (HTTPS). */
  unsubscribeUrl: string;
  /** `List-Unsubscribe` başlığındaki tek tık (POST) adresi (RFC 8058); posta istemcileri doğrudan buna POST eder. */
  oneClickUrl: string;
  /** Bu iletinin RFC Message-ID'si (köşeli parantezli). */
  messageId: string;
  /** Aynı konuşmanın önceki iletileri; takip e-postaları aynı thread'de görünür. */
  inReplyTo?: string;
  references?: string[];
  cc?: string[];
  bcc?: string[];
};

export const newMessageId = (domain: string) => `<${crypto.randomUUID()}@${domain}>`;

/** Takip adımlarında konu "Re: ..." olur (aynı konuşma); ilk adımda olduğu gibi kalır. */
export function threadSubject(subject: string, isFollowUp: boolean, rootSubject?: string): string {
  if (!isFollowUp) return subject;
  const base = (rootSubject ?? subject).replace(/^(re|yanıt):\s*/i, "");
  return `Re: ${base}`;
}

export function composeText(i: Pick<BuildInput, "body" | "signature" | "includeSignature" | "identity" | "unsubscribeUrl">): string {
  const parts = [i.body.trim()];
  if (i.includeSignature && i.signature.trim()) parts.push(i.signature.trim());
  const footer = [i.identity.trim(), `Bu iletileri almak istemiyorsanız abonelikten çıkabilirsiniz: ${i.unsubscribeUrl}`].filter(Boolean).join("\n");
  return `${parts.join("\n\n")}\n\n--\n${footer}\n`;
}

export function buildOutgoing(i: BuildInput): OutgoingMail {
  return {
    from: i.fromName ? { name: i.fromName, address: i.fromEmail } : i.fromEmail,
    to: i.to,
    cc: i.cc?.length ? i.cc : undefined,
    bcc: i.bcc?.length ? i.bcc : undefined,
    subject: i.subject,
    text: composeText(i),
    messageId: i.messageId,
    inReplyTo: i.inReplyTo,
    references: i.references?.length ? i.references : undefined,
    headers: {
      // Gmail ve Yahoo toplu gönderici kuralları: tek tıkla abonelik başlıkları (RFC 8058)
      "List-Unsubscribe": `<${i.oneClickUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
