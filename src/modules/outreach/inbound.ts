/**
 * Posta kutusuna gelen iletilerin sınıflandırılması (saf): yanıt mı, otomatik yanıt (ofis dışı) mı, geri dönen
 * e-posta (bounce) mı? Ve bounce raporundan hangi gönderimin, hangi adrese ulaşamadığının çıkarılması.
 */

export type InboundKind = "bounce" | "ooo" | "yanit" | "diger";

export type InboundHeaders = {
  from: string;
  subject: string;
  contentType?: string;
  autoSubmitted?: string;
  precedence?: string;
  xAutoreply?: string;
  inReplyTo?: string;
  references?: string;
};

/** "<a@b> <c@d>" ya da tek kimlik dizisinden köşeli parantezsiz Message-ID'ler. */
export function messageIds(value: string | undefined): string[] {
  return [...(value ?? "").matchAll(/<([^<>\s]+)>/g)].map((m) => m[1]);
}

const BOUNCE_FROM = /mailer-daemon|postmaster|mail delivery (sub)?system|mailer daemon/i;
const BOUNCE_SUBJECT = /undeliver|delivery status|returned mail|delivery (has )?failed|failure notice|mail delivery failed|teslim edilemedi|iletilemedi|geri döndü/i;
const OOO_SUBJECT = /out of office|automatic reply|auto-?reply|autoreply|vacation|otomatik yanıt|ofis dışında|izinde|yıllık izin|tatilde/i;

/**
 * Sınıflama sırası: bounce → otomatik yanıt → yanıt. Yanıt sayılması için iletinin bizim gönderdiğimiz bir iletiyi
 * (In-Reply-To / References ile) işaret etmesi gerekir; aksi halde "diger".
 */
export function classifyInbound(h: InboundHeaders, ourMessageIds: ReadonlySet<string>): InboundKind {
  if (BOUNCE_FROM.test(h.from) || /report-type=delivery-status/i.test(h.contentType ?? "") || BOUNCE_SUBJECT.test(h.subject)) return "bounce";

  const auto = (h.autoSubmitted ?? "").toLowerCase();
  const precedence = (h.precedence ?? "").toLowerCase();
  if ((auto && auto !== "no") || h.xAutoreply || /auto[_-]?reply|bulk|junk/.test(precedence) || OOO_SUBJECT.test(h.subject)) return "ooo";

  const refs = [...messageIds(h.inReplyTo), ...messageIds(h.references)];
  return refs.some((id) => ourMessageIds.has(id)) ? "yanit" : "diger";
}

/**
 * Bounce (DSN) metninden asıl gönderimin Message-ID'sini ve ulaşamayan adresi çıkarır. Birçok sunucu asıl iletinin
 * başlıklarını rapora ekler; `Final-Recipient`/`X-Failed-Recipients` ise ulaşamayan adresi verir.
 */
export function parseBounce(raw: string, ourMessageIds?: ReadonlySet<string>): { messageId: string | null; recipient: string | null; permanent: boolean } {
  const ids = [...raw.matchAll(/Message-ID:\s*<([^<>\s]+)>/gi)].map((m) => m[1]);
  const messageId = (ourMessageIds ? ids.find((id) => ourMessageIds.has(id)) : undefined) ?? ids[ids.length - 1] ?? null;
  const rcpt =
    /X-Failed-Recipients:\s*([^\s,;]+)/i.exec(raw)?.[1] ??
    /Final-Recipient:\s*rfc822;\s*([^\s;]+)/i.exec(raw)?.[1] ??
    /Original-Recipient:\s*rfc822;\s*([^\s;]+)/i.exec(raw)?.[1] ??
    null;
  // 5.x.x = kalıcı hata; 4.x.x = geçici (kutu dolu vb.)
  const status = /Status:\s*([245])\.\d+\.\d+/i.exec(raw)?.[1] ?? /\b([245])\d\d[ -]\d\.\d\.\d/.exec(raw)?.[1];
  return { messageId, recipient: rcpt ? rcpt.toLowerCase().replace(/^<|>$/g, "") : null, permanent: status !== "4" };
}
