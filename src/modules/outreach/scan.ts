import "server-only";
import { simpleParser } from "mailparser";
import { db } from "@/lib/supabase/server";
import { addSuppression } from "./contacts";
import { decryptSecret } from "./crypto";
import { companyDomain } from "./company";
import { addEvent, finishContactEnrollments } from "./enrollments";
import { getProfile, getRaw, newInboxMessageIds } from "./gmail";
import { withImap, type ImapConfig } from "./imap";
import { classifyInbound, messageIds, parseBounce } from "./inbound";

/**
 * Gönderici adresinin gelen kutusunu tarar: kampanya e-postalarımıza gelen yanıtları, ofis dışı otomatik yanıtları ve geri dönen
 * (bounce) e-postaları bulur; kampanyayı durdurur, kara listeyi ve kişi durumunu günceller. Sunucusuz ortamda kalıcı
 * bağlantı yoktur: her çağrı bağlan → yeni iletileri oku → kapat. Okunan son UID gönderici adresinde saklanır.
 */

export type ScanResult = { scanned: number; replies: number; ooo: number; bounces: number };

const MAX_PER_SCAN = 100;
const MAX_SOURCE_BYTES = 300_000;
const OOO_PAUSE_DAYS = 3;

/** Ham başlık bloğunu ("Ad: değer", katlanmış satırlarla) küçük harfli anahtarlı nesneye çevirir. */
export function parseHeaders(raw: Buffer | string): Record<string, string> {
  const text = (typeof raw === "string" ? raw : raw.toString("utf8")).replace(/\r?\n[ \t]+/g, " ");
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) out[line.slice(0, i).trim().toLowerCase()] ??= line.slice(i + 1).trim();
  }
  return out;
}

/** Alıntıları ve imzayı atıp yanıtın ilk birkaç satırını döndürür (olay günlüğünde göstermek için). */
export function replySnippet(text: string): string {
  const lines: string[] = [];
  for (const l of text.split(/\r?\n/)) {
    if (/^>/.test(l) || /^(on .+ wrote:|.+ tarihinde .+ yazdı:?)$/i.test(l.trim()) || /^-{2,}\s*(original|forwarded)/i.test(l.trim())) break;
    lines.push(l);
  }
  return lines.join(" ").replace(/\s+/g, " ").trim().slice(0, 400);
}

type MailboxRow = {
  id: string;
  user_uid: string;
  email: string;
  provider: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  username: string;
  secret_enc: string;
  imap_uidvalidity: number | null;
  imap_last_uid: number;
  gmail_history_id: string | null;
};

type SentRow = { id: string; message_id: string; enrollment_id: string | null; sequence_id: string | null; contact_id: string | null; to_email: string };

async function findSent(uid: string, mailboxId: string, ids: string[]): Promise<Map<string, SentRow>> {
  const map = new Map<string, SentRow>();
  if (ids.length === 0) return map;
  const { data } = await db().from("outreach_messages").select("id, message_id, enrollment_id, sequence_id, contact_id, to_email").eq("user_uid", uid).eq("mailbox_id", mailboxId).in("message_id", ids).returns<SentRow[]>();
  for (const r of data ?? []) map.set(r.message_id, r);
  return map;
}

async function onReply(uid: string, sent: SentRow, info: { subject: string; from: string; snippet: string }) {
  const now = new Date().toISOString();
  await db().from("outreach_messages").update({ replied_at: now }).eq("id", sent.id).is("replied_at", null);
  if (sent.enrollment_id) {
    await db().from("outreach_enrollments").update({ status: "bitti", finish_reason: "yanit", next_run_at: null, claimed_until: null }).eq("id", sent.enrollment_id).in("status", ["aktif", "duraklatildi"]);
  }
  await addEvent({ uid, kind: "yanit", sequenceId: sent.sequence_id, enrollmentId: sent.enrollment_id, messageRowId: sent.id, contactId: sent.contact_id, meta: info });
  await stopSameCompany(uid, sent);
}

/**
 * Aynı şirketten (aynı kişisel olmayan alan adı) biri yanıt verdiyse, o şirketin aynı kampanyadaki diğer kişilerinin dizisini durdurur:
 * iş arkadaşına aynı konuda tekrar yazmak yanıt vereni rahatsız eder. Kampanya ayarından kapatılabilir.
 */
async function stopSameCompany(uid: string, sent: SentRow) {
  if (!sent.sequence_id || !sent.contact_id) return;
  const { data: seq } = await db().from("outreach_sequences").select("settings").eq("id", sent.sequence_id).maybeSingle();
  if ((seq?.settings as { stopOnCompanyReply?: boolean } | null)?.stopOnCompanyReply === false) return;

  const { data: me } = await db().from("outreach_contacts").select("email").eq("user_uid", uid).eq("id", sent.contact_id).maybeSingle<{ email: string | null }>();
  const domain = companyDomain(me?.email);
  if (!domain) return;

  const { data: mates } = await db().from("outreach_contacts").select("id").eq("user_uid", uid).ilike("email", `%@${domain}`).neq("id", sent.contact_id).limit(200).returns<{ id: string }[]>();
  const ids = (mates ?? []).map((m) => m.id);
  if (ids.length === 0) return;

  const { data: stopped } = await db()
    .from("outreach_enrollments")
    .update({ status: "bitti", finish_reason: "sirket", next_run_at: null, claimed_until: null })
    .eq("sequence_id", sent.sequence_id)
    .in("contact_id", ids)
    .in("status", ["aktif", "duraklatildi"])
    .select("id, contact_id")
    .returns<{ id: string; contact_id: string }[]>();
  for (const e of stopped ?? []) {
    await addEvent({ uid, kind: "bitti", sequenceId: sent.sequence_id, enrollmentId: e.id, contactId: e.contact_id, meta: { reason: "sirket", domain } });
  }
}

async function onAutoReply(uid: string, sent: SentRow, subject: string) {
  if (sent.enrollment_id && sent.sequence_id) {
    const { data } = await db().from("outreach_sequences").select("settings").eq("id", sent.sequence_id).maybeSingle();
    const pause = (data?.settings as { pauseOnOoo?: boolean } | null)?.pauseOnOoo !== false;
    if (pause) {
      await db()
        .from("outreach_enrollments")
        .update({ next_run_at: new Date(Date.now() + OOO_PAUSE_DAYS * 86_400_000).toISOString() })
        .eq("id", sent.enrollment_id)
        .eq("status", "aktif");
    }
  }
  await addEvent({ uid, kind: "otomatik_yanit", sequenceId: sent.sequence_id, enrollmentId: sent.enrollment_id, messageRowId: sent.id, contactId: sent.contact_id, meta: { subject } });
}

async function onBounce(uid: string, mailboxId: string, raw: string) {
  const bodyIds = [...raw.matchAll(/Message-ID:\s*<([^<>\s]+)>/gi)].map((m) => m[1]);
  const parsed = parseBounce(raw);
  const found = await findSent(uid, mailboxId, bodyIds);
  let sent: SentRow | undefined = bodyIds.map((id) => found.get(id)).find(Boolean);
  if (!sent && parsed.recipient) {
    // Asıl ileti bulunamadıysa: bu gönderici adresinden o alıcıya en son gönderilen ileti
    const { data } = await db().from("outreach_messages").select("id, message_id, enrollment_id, sequence_id, contact_id, to_email").eq("user_uid", uid).eq("mailbox_id", mailboxId).eq("to_email", parsed.recipient).order("sent_at", { ascending: false }).limit(1).returns<SentRow[]>();
    sent = data?.[0];
  }
  if (!sent) return false;

  if (parsed.permanent) {
    await db().from("outreach_messages").update({ status: "bounce", bounced_at: new Date().toISOString(), error: "Alıcı adresine ulaşılamadı" }).eq("id", sent.id);
    await addSuppression(uid, { email: sent.to_email, reason: "bounce" }).catch(() => undefined);
    if (sent.contact_id) {
      await db().from("outreach_contacts").update({ email_status: "gecersiz" }).eq("user_uid", uid).eq("id", sent.contact_id);
      await finishContactEnrollments(uid, sent.contact_id, "bounce");
    }
  }
  await addEvent({ uid, kind: "bounce", sequenceId: sent.sequence_id, enrollmentId: sent.enrollment_id, messageRowId: sent.id, contactId: sent.contact_id, meta: { permanent: parsed.permanent, via: "imap" } });
  return true;
}

type InboundItem = { from: string; fromName: string; subject: string; h: Record<string, string>; source: () => Promise<Buffer | null> };

/** Tek bir gelen iletiyi sınıflandırıp (yanıt / ofis dışı / bounce) kampanya kayıtlarına işler. IMAP ve Gmail API taramaları ortak kullanır. */
async function handleInbound(row: Pick<MailboxRow, "id" | "user_uid">, item: InboundItem, ours: Set<string>, sentMap: Map<string, SentRow>, res: ScanResult) {
  const { h } = item;
  try {
    const kind = classifyInbound(
      { from: `${item.fromName} <${item.from}>`, subject: item.subject, contentType: h["content-type"], autoSubmitted: h["auto-submitted"], precedence: h["precedence"], xAutoreply: h["x-autoreply"] ?? h["x-auto-response-suppress"], inReplyTo: h["in-reply-to"], references: h["references"] },
      ours,
    );
    if (kind === "diger") return;
    const refs = [...messageIds(h["in-reply-to"]), ...messageIds(h["references"])];
    const sent = refs.map((id) => sentMap.get(id)).find(Boolean);

    if (kind === "bounce") {
      const src = await item.source();
      if (src && (await onBounce(row.user_uid, row.id, src.toString("utf8")))) res.bounces++;
    } else if (kind === "ooo" && sent) {
      await onAutoReply(row.user_uid, sent, item.subject);
      res.ooo++;
    } else if (kind === "yanit" && sent) {
      const src = await item.source();
      const text = src ? ((await simpleParser(src)).text ?? "") : "";
      await onReply(row.user_uid, sent, { subject: item.subject, from: item.from, snippet: replySnippet(text) });
      res.replies++;
    }
  } catch (e) {
    console.error("Gelen ileti işlenemedi:", e instanceof Error ? e.message : e);
  }
}

/** Google OAuth ile bağlı gönderici adresinin gelen kutusunu Gmail API ile tarar (geçmiş kimliğinden itibaren yeni iletiler). */
export async function scanGoogleMailbox(row: MailboxRow): Promise<ScanResult> {
  const res: ScanResult = { scanned: 0, replies: 0, ooo: 0, bounces: 0 };
  const refresh = decryptSecret(row.secret_enc);
  const touch = (patch: Record<string, unknown>) => db().from("outreach_mailboxes").update({ imap_checked_at: new Date().toISOString(), last_error: null, ...patch }).eq("id", row.id);

  // İlk tarama ya da geçmiş kaydı süresi dolmuş (Gmail ~1 hafta saklar): bugünden itibaren izlenir.
  if (!row.gmail_history_id) {
    await touch({ gmail_history_id: (await getProfile(refresh)).historyId });
    return res;
  }
  const found = await newInboxMessageIds(refresh, row.gmail_history_id);
  if (!found) {
    await touch({ gmail_history_id: (await getProfile(refresh)).historyId });
    return res;
  }

  const msgs: { id: string; raw: Buffer; h: Record<string, string> }[] = [];
  for (const id of found.ids.slice(0, MAX_PER_SCAN)) {
    const m = await getRaw(refresh, id);
    if (!m || m.raw.length > MAX_SOURCE_BYTES) continue;
    const end = m.raw.indexOf("\r\n\r\n");
    msgs.push({ id, raw: m.raw, h: parseHeaders(m.raw.subarray(0, end > 0 ? end : Math.min(m.raw.length, 20_000))) });
  }
  res.scanned = msgs.length;

  const refIds = [...new Set(msgs.flatMap(({ h }) => [...messageIds(h["in-reply-to"]), ...messageIds(h["references"])]))];
  const sentMap = await findSent(row.user_uid, row.id, refIds);
  const ours = new Set(sentMap.keys());

  for (const m of msgs) {
    const from = /^(?:"?([^"<]*)"?\s*)?<?([^<>\s]+@[^<>\s]+)>?$/.exec(m.h["from"] ?? "");
    await handleInbound(row, { from: from?.[2] ?? "", fromName: (from?.[1] ?? "").trim(), subject: decodeSubject(m.h["subject"] ?? ""), h: m.h, source: async () => m.raw }, ours, sentMap, res);
  }
  await touch({ gmail_history_id: found.historyId });
  return res;
}

/** RFC 2047 kodlu ("=?UTF-8?B?...?=") konu başlığını çözer; çözülemezse olduğu gibi bırakır. */
function decodeSubject(v: string): string {
  return v.replace(/=\?([\w-]+)\?([bq])\?([^?]*)\?=/gi, (whole, cs: string, enc: string, text: string) => {
    try {
      const buf = enc.toLowerCase() === "b" ? Buffer.from(text, "base64") : Buffer.from(text.replace(/_/g, " ").replace(/=([0-9a-f]{2})/gi, (_m, x: string) => String.fromCharCode(parseInt(x, 16))), "latin1");
      return new TextDecoder(cs).decode(buf);
    } catch {
      return whole;
    }
  });
}

export async function scanMailbox(row: MailboxRow): Promise<ScanResult> {
  if (row.provider === "google") return scanGoogleMailbox(row);
  const res: ScanResult = { scanned: 0, replies: 0, ooo: 0, bounces: 0 };
  const cfg: ImapConfig = { host: row.imap_host, port: row.imap_port, secure: row.imap_secure, user: row.username, pass: decryptSecret(row.secret_enc) };

  await withImap(cfg, async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const mb = client.mailbox;
      if (!mb) return;
      const validity = Number(mb.uidValidity);
      const next = mb.uidNext;
      const touch = (patch: Record<string, unknown>) => db().from("outreach_mailboxes").update({ imap_checked_at: new Date().toISOString(), ...patch }).eq("id", row.id);

      // İlk tarama ya da UIDVALIDITY değişimi: geçmiş iletiler işlenmez, bugünden itibaren izlenir.
      if (row.imap_uidvalidity === null || Number(row.imap_uidvalidity) !== validity) {
        await touch({ imap_uidvalidity: validity, imap_last_uid: Math.max(next - 1, 0) });
        return;
      }
      const from = row.imap_last_uid + 1;
      if (next <= from) return void (await touch({}));

      const msgs: Awaited<ReturnType<typeof collect>> = await collect();
      async function collect() {
        const list = [];
        for await (const m of client.fetch(`${from}:*`, { uid: true, envelope: true, size: true, headers: ["in-reply-to", "references", "auto-submitted", "precedence", "x-autoreply", "x-auto-response-suppress", "content-type"] }, { uid: true })) {
          if (m.uid >= from) list.push(m);
          if (list.length >= MAX_PER_SCAN) break;
        }
        return list.sort((a, b) => a.uid - b.uid);
      }
      res.scanned = msgs.length;

      // Başlıklardaki tüm Message-ID'lerden bu gönderici adresinin gönderdiklerini tek sorguda bul
      const heads = msgs.map((m) => ({ m, h: parseHeaders(m.headers ?? "") }));
      const refIds = [...new Set(heads.flatMap(({ h }) => [...messageIds(h["in-reply-to"]), ...messageIds(h["references"])]))];
      const sentMap = await findSent(row.user_uid, row.id, refIds);
      const ours = new Set(sentMap.keys());

      const source = async (uid: number) => {
        const one = await client.fetchOne(String(uid), { source: true, size: true }, { uid: true });
        if (!one || !one.source || (one.size ?? 0) > MAX_SOURCE_BYTES) return null;
        return one.source;
      };

      for (const { m, h } of heads) {
        await handleInbound(row, { from: m.envelope?.from?.[0]?.address ?? "", fromName: m.envelope?.from?.[0]?.name ?? "", subject: m.envelope?.subject ?? "", h, source: () => source(m.uid) }, ours, sentMap, res);
      }

      const lastUid = msgs.at(-1)?.uid ?? from - 1;
      await touch({ imap_last_uid: Math.max(lastUid, row.imap_last_uid) });
    } finally {
      lock.release();
    }
  });
  return res;
}

/** En uzun süredir taranmayan bağlı gönderici adreslerinden en çok `limit` tanesini tarar (her biri en geç 2 dakikada bir). */
export async function scanDueMailboxes(limit = 3, deadlineMs = 120_000): Promise<ScanResult & { mailboxes: number }> {
  const total = { scanned: 0, replies: 0, ooo: 0, bounces: 0, mailboxes: 0 };
  const deadline = Date.now() + deadlineMs;
  const since = new Date(Date.now() - 2 * 60_000).toISOString();
  const { data } = await db()
    .from("outreach_mailboxes")
    .select("id, user_uid, email, provider, imap_host, imap_port, imap_secure, username, secret_enc, imap_uidvalidity, imap_last_uid, gmail_history_id")
    .eq("status", "bagli")
    .or(`imap_checked_at.is.null,imap_checked_at.lt.${since}`)
    .order("imap_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit)
    .returns<MailboxRow[]>();
  for (const row of data ?? []) {
    if (Date.now() > deadline) break;
    try {
      const r = await scanMailbox(row);
      total.scanned += r.scanned;
      total.replies += r.replies;
      total.ooo += r.ooo;
      total.bounces += r.bounces;
      total.mailboxes++;
    } catch (e) {
      // Bağlantı hatası: bir sonraki turda yeniden denenir; sürekli hata verirse kullanıcı Gönderici adresleri'nda görür.
      await db().from("outreach_mailboxes").update({ imap_checked_at: new Date().toISOString(), last_error: e instanceof Error ? e.message.slice(0, 200) : "Gelen kutusu okunamadı" }).eq("id", row.id);
    }
  }
  return total;
}
