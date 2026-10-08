import "server-only";
import { db } from "@/lib/supabase/server";
import { OutreachUnavailableError } from "./contacts";
import { decryptSecret, encryptSecret } from "./crypto";
import type { DnsReport } from "./dns-health";
import { maxMailboxes, type Mailbox, type MailboxInput } from "./mailbox-schema";

export class DuplicateMailboxError extends Error {
  constructor() {
    super("Bu posta kutusu zaten bağlı.");
  }
}

type DbError = { code?: string; message: string };
function check(what: string, error: DbError | null) {
  if (!error) return;
  if (error.code === "42P01" || error.code === "PGRST205") throw new OutreachUnavailableError();
  if (error.code === "23505") throw new DuplicateMailboxError();
  throw new Error(`${what}: ${error.message}`);
}

type Row = {
  id: string;
  email: string;
  from_name: string | null;
  signature: string;
  provider: Mailbox["provider"];
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  username: string;
  status: Mailbox["status"];
  last_error: string | null;
  daily_limit: number;
  hourly_limit: number;
  warmup_enabled: boolean;
  warmup_started_at: string | null;
  warmup_score: number | null;
  dns_check: DnsReport | null;
  dns_checked_at: string | null;
  created_at: string;
};

/** Şifre (`secret_enc`) bilinçli olarak bu listede yok: istemciye giden türler onu hiç görmez. */
const columns =
  "id, email, from_name, signature, provider, smtp_host, smtp_port, smtp_secure, imap_host, imap_port, imap_secure, username, status, last_error, daily_limit, hourly_limit, warmup_enabled, warmup_started_at, warmup_score, dns_check, dns_checked_at, created_at";

const toMailbox = (r: Row): Mailbox => ({
  id: r.id,
  email: r.email,
  fromName: r.from_name,
  signature: r.signature,
  provider: r.provider,
  smtp: { host: r.smtp_host, port: r.smtp_port, secure: r.smtp_secure },
  imap: { host: r.imap_host, port: r.imap_port, secure: r.imap_secure },
  username: r.username,
  status: r.status,
  lastError: r.last_error,
  dailyLimit: r.daily_limit,
  hourlyLimit: r.hourly_limit,
  warmupEnabled: r.warmup_enabled,
  warmupStartedAt: r.warmup_started_at,
  warmupScore: r.warmup_score,
  dnsCheck: r.dns_check,
  dnsCheckedAt: r.dns_checked_at,
  createdAt: r.created_at,
});

export async function listMailboxes(uid: string): Promise<Mailbox[]> {
  const { data, error } = await db().from("outreach_mailboxes").select(columns).eq("user_uid", uid).order("created_at", { ascending: true }).returns<Row[]>();
  check("Posta kutuları okunamadı", error);
  return (data ?? []).map(toMailbox);
}

export async function getMailbox(uid: string, id: string): Promise<Mailbox | null> {
  const { data, error } = await db().from("outreach_mailboxes").select(columns).eq("user_uid", uid).eq("id", id).maybeSingle<Row>();
  check("Posta kutusu okunamadı", error);
  return data ? toMailbox(data) : null;
}

/** Bağlantı bilgileriyle birlikte (şifre çözülmüş) döndürür. YALNIZCA sunucuda, gönderim/okuma için kullanılır. */
export async function getMailboxCredentials(uid: string, id: string): Promise<{ mailbox: Mailbox; password: string } | null> {
  const { data, error } = await db().from("outreach_mailboxes").select(`${columns}, secret_enc`).eq("user_uid", uid).eq("id", id).maybeSingle<Row & { secret_enc: string }>();
  check("Posta kutusu okunamadı", error);
  return data ? { mailbox: toMailbox(data), password: decryptSecret(data.secret_enc) } : null;
}

export async function createMailbox(uid: string, input: MailboxInput, dns: DnsReport | null, imap?: { uidValidity: number; uidNext: number }): Promise<Mailbox> {
  const existing = await listMailboxes(uid);
  if (existing.length >= maxMailboxes) throw new Error(`En fazla ${maxMailboxes} posta kutusu bağlayabilirsiniz.`);
  const { data, error } = await db()
    .from("outreach_mailboxes")
    .insert({
      user_uid: uid,
      email: input.email,
      from_name: input.fromName,
      provider: input.provider,
      smtp_host: input.smtp.host,
      smtp_port: input.smtp.port,
      smtp_secure: input.smtp.secure,
      imap_host: input.imap.host,
      imap_port: input.imap.port,
      imap_secure: input.imap.secure,
      username: input.username ?? input.email,
      secret_enc: encryptSecret(input.password),
      dns_check: dns,
      dns_checked_at: dns ? new Date().toISOString() : null,
      // Bağlandığı andaki gelen kutusu: bundan önceki iletiler yanıt/bounce taramasında yok sayılır.
      ...(imap ? { imap_uidvalidity: imap.uidValidity, imap_last_uid: Math.max(imap.uidNext - 1, 0), imap_checked_at: new Date().toISOString() } : {}),
    })
    .select(columns)
    .single<Row>();
  check("Posta kutusu eklenemedi", error);
  return toMailbox(data!);
}

export async function updateMailbox(
  uid: string,
  id: string,
  patch: { fromName?: string | null; signature?: string; dailyLimit?: number; hourlyLimit?: number; status?: Mailbox["status"]; password?: string; lastError?: string | null },
): Promise<Mailbox | null> {
  const update: Record<string, unknown> = {};
  if (patch.fromName !== undefined) update.from_name = patch.fromName || null;
  if (patch.signature !== undefined) update.signature = patch.signature;
  if (patch.dailyLimit !== undefined) update.daily_limit = patch.dailyLimit;
  if (patch.hourlyLimit !== undefined) update.hourly_limit = patch.hourlyLimit;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.password !== undefined) update.secret_enc = encryptSecret(patch.password);
  if (patch.lastError !== undefined) update.last_error = patch.lastError;
  if (Object.keys(update).length === 0) return getMailbox(uid, id);
  const { data, error } = await db().from("outreach_mailboxes").update(update).eq("user_uid", uid).eq("id", id).select(columns).maybeSingle<Row>();
  check("Posta kutusu güncellenemedi", error);
  return data ? toMailbox(data) : null;
}

export async function saveDnsCheck(uid: string, id: string, dns: DnsReport): Promise<Mailbox | null> {
  const { data, error } = await db()
    .from("outreach_mailboxes")
    .update({ dns_check: dns, dns_checked_at: new Date().toISOString() })
    .eq("user_uid", uid)
    .eq("id", id)
    .select(columns)
    .maybeSingle<Row>();
  check("Alan adı denetimi kaydedilemedi", error);
  return data ? toMailbox(data) : null;
}

export async function deleteMailbox(uid: string, id: string) {
  const { error } = await db().from("outreach_mailboxes").delete().eq("user_uid", uid).eq("id", id);
  check("Posta kutusu silinemedi", error);
}
