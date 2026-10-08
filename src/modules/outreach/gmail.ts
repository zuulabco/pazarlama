import "server-only";
import MailComposer from "nodemailer/lib/mail-composer";
import type { OutgoingMail } from "./smtp";

/**
 * Google OAuth ile bağlanan gönderici adresleri için Gmail API istemcisi (gönderme ve gelen kutusunu okuma).
 * İzinler: gmail.send (gönderme) ve gmail.readonly (yanıt/geri dönen e-postaları bulma). Hiçbir iletiyi silmez/değiştirmez.
 */

export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly"] as const;

const API = "https://gmail.googleapis.com/gmail/v1/users/me";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export class GmailApiError extends Error {
  /** SMTP hata sınıflandırmasıyla uyumlu alanlar (sender.classifySmtpFailure). */
  code?: string;
  responseCode?: number;
  response?: string;
  constructor(
    message: string,
    readonly status: number,
    extra: { code?: string; responseCode?: number; response?: string } = {},
  ) {
    super(message);
    this.name = "GmailApiError";
    Object.assign(this, extra);
  }
}

export class GoogleConfigError extends Error {
  constructor() {
    super("Google ile bağlanma sunucuda yapılandırılmamış (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).");
  }
}

const strip = (v: string | undefined) => (v ?? "").trim().replace(/^"|"$/g, "");
export const googleConfigured = () => Boolean(strip(process.env.GOOGLE_CLIENT_ID) && strip(process.env.GOOGLE_CLIENT_SECRET));

export function googleClient(): { id: string; secret: string } {
  const id = strip(process.env.GOOGLE_CLIENT_ID);
  const secret = strip(process.env.GOOGLE_CLIENT_SECRET);
  if (!id || !secret) throw new GoogleConfigError();
  return { id, secret };
}

type TokenResponse = { access_token?: string; expires_in?: number; refresh_token?: string; scope?: string; error?: string; error_description?: string };

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const { id, secret } = googleClient();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, ...params }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok) {
    // invalid_grant: kullanıcı erişimi geri aldı, parolasını değiştirdi ya da test modunda jeton 7 günde sona erdi.
    const revoked = body.error === "invalid_grant";
    throw new GmailApiError(
      revoked ? "Google erişimi sona ermiş. Gönderici adresini “Google ile bağlan” ile yeniden bağlayın." : "Google ile iletişim kurulamadı. Biraz sonra tekrar deneyin.",
      res.status,
      revoked ? { code: "EAUTH" } : {},
    );
  }
  return body;
}

/** Yetkilendirme kodunu jetonlarla değiştirir (OAuth dönüş adresinde). */
export const exchangeCode = (code: string, redirectUri: string) => tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri });

const cache = new Map<string, { token: string; until: number }>();

/** Yenileme jetonundan kısa ömürlü erişim jetonu üretir (sunucu örneği içinde süresi dolana kadar önbelleğe alınır). */
export async function accessToken(refreshToken: string): Promise<string> {
  const hit = cache.get(refreshToken);
  if (hit && hit.until > Date.now() + 60_000) return hit.token;
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
  if (!t.access_token) throw new GmailApiError("Google erişim jetonu alınamadı.", 502);
  cache.set(refreshToken, { token: t.access_token, until: Date.now() + (t.expires_in ?? 3600) * 1000 });
  if (cache.size > 200) cache.delete(cache.keys().next().value!);
  return t.access_token;
}

async function call<T>(refreshToken: string, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await accessToken(refreshToken);
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(25_000),
  });
  if (res.ok) return (await res.json().catch(() => ({}))) as T;
  const err = (await res.json().catch(() => null)) as { error?: { message?: string; errors?: { reason?: string }[] } } | null;
  const reason = err?.error?.errors?.[0]?.reason ?? "";
  const message = err?.error?.message ?? "";
  if (res.status === 401 || (res.status === 403 && /insufficient|scope/i.test(`${reason} ${message}`))) {
    cache.delete(refreshToken);
    throw new GmailApiError("Google erişimi yetersiz ya da sona ermiş. Gönderici adresini “Google ile bağlan” ile yeniden bağlayın.", res.status, { code: "EAUTH" });
  }
  if (res.status === 400 && /invalid.*(to|recipient)|recipient address|invalid address/i.test(message)) {
    throw new GmailApiError("Alıcı adresi geçersiz.", 400, { responseCode: 550, response: "550 5.1.1 invalid recipient address" });
  }
  if (res.status === 429 || (res.status === 403 && /rate|quota|limit/i.test(`${reason} ${message}`))) {
    throw new GmailApiError("Google günlük gönderim sınırına ulaşıldı. Daha sonra yeniden denenecek.", res.status, { code: "ELIMIT" });
  }
  throw new GmailApiError(`Gmail isteği başarısız (${res.status}).`, res.status);
}

/** Hesabın e-posta adresi ve geçerli geçmiş kimliği. */
export const getProfile = (refreshToken: string) => call<{ emailAddress: string; historyId: string }>(refreshToken, "/profile");

/** E-postayı ham RFC 822 metnine çevirir ve Gmail API ile gönderir. Gerçek Message-ID'yi döndürür. */
export async function sendViaGmail(refreshToken: string, mail: OutgoingMail): Promise<{ messageId: string }> {
  const node = new MailComposer(mail).compile();
  node.keepBcc = true; // Gmail, Bcc başlığındaki alıcılara da gönderir ve başlığı kendisi siler
  const raw = await node.build();
  const sent = await call<{ id: string }>(refreshToken, "/messages/send", { method: "POST", body: { raw: raw.toString("base64url") } });
  // Gmail gönderilen iletinin Message-ID'sini değiştirebilir; yanıtlar buna bağlanacağı için gerçeğini oku.
  try {
    const meta = await call<{ payload?: { headers?: { name: string; value: string }[] } }>(refreshToken, `/messages/${sent.id}?format=metadata&metadataHeaders=Message-ID`);
    const real = meta.payload?.headers?.find((h) => h.name.toLowerCase() === "message-id")?.value;
    if (real) return { messageId: real };
  } catch {
    // Okunamazsa kendi atadığımız kimlik kullanılır.
  }
  return { messageId: String(mail.messageId ?? "") };
}

export type GmailMessage = { id: string; raw: Buffer; size: number };

/** `historyId`'den sonra gelen kutusuna düşen yeni iletilerin kimlikleri; `historyId` geçersizse null (yeniden başlatılmalı). */
export async function newInboxMessageIds(refreshToken: string, historyId: string): Promise<{ ids: string[]; historyId: string } | null> {
  const ids = new Set<string>();
  let pageToken: string | undefined;
  let latest = historyId;
  try {
    do {
      const q = new URLSearchParams({ startHistoryId: historyId, historyTypes: "messageAdded", labelId: "INBOX", maxResults: "100" });
      if (pageToken) q.set("pageToken", pageToken);
      const r = await call<{ history?: { messagesAdded?: { message: { id: string; labelIds?: string[] } }[] }[]; historyId?: string; nextPageToken?: string }>(refreshToken, `/history?${q}`);
      for (const h of r.history ?? []) for (const a of h.messagesAdded ?? []) if (a.message.labelIds?.includes("INBOX")) ids.add(a.message.id);
      if (r.historyId) latest = r.historyId;
      pageToken = r.nextPageToken;
    } while (pageToken && ids.size < 100);
  } catch (e) {
    if (e instanceof GmailApiError && e.status === 404) return null;
    throw e;
  }
  return { ids: [...ids], historyId: latest };
}

/**
 * Son 3 günde spam klasörüne düşen Adspine ısındırma iletilerinin jetonları. Yalnızca okuma izniyle çalışır (taşıma için
 * gmail.modify gerekir ve bu izin istenmez); bu yüzden ölçülür ama kurtarılamaz.
 */
export async function listSpamTokens(refreshToken: string): Promise<string[]> {
  const list = await call<{ messages?: { id: string }[] }>(refreshToken, `/messages?${new URLSearchParams({ q: "in:spam newer_than:3d", maxResults: "25" })}`);
  const tokens: string[] = [];
  for (const m of list.messages ?? []) {
    const meta = await call<{ payload?: { headers?: { name: string; value: string }[] } }>(refreshToken, `/messages/${m.id}?format=metadata&metadataHeaders=X-Adspine-Warmup`);
    const t = meta.payload?.headers?.find((h) => h.name.toLowerCase() === "x-adspine-warmup")?.value?.trim();
    if (t) tokens.push(t);
  }
  return tokens;
}

export async function getRaw(refreshToken: string, id: string): Promise<GmailMessage | null> {
  try {
    const m = await call<{ id: string; raw?: string; sizeEstimate?: number }>(refreshToken, `/messages/${id}?format=raw`);
    return m.raw ? { id, raw: Buffer.from(m.raw, "base64url"), size: m.sizeEstimate ?? 0 } : null;
  } catch (e) {
    if (e instanceof GmailApiError && e.status === 404) return null;
    throw e;
  }
}
