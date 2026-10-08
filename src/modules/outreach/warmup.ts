import "server-only";
import { db } from "@/lib/supabase/server";
import { deliver } from "./mailer";
import { withImap } from "./imap";
import { getMailboxCredentials } from "./mailboxes";
import { newMessageId } from "./mime";
import { isWithinWindow, type Schedule } from "./schedule";
import { friendlySmtpError } from "./smtp";
import { newWarmupToken, warmupMessage, warmupReply } from "./warmup-bank";
import { daysSince, LOST_AFTER_MS, summarize, warmupQuota, warmupScore, type WarmupStats, type WarmupStatus } from "./warmup-rules";
import { classifySmtpFailure } from "./sender";
import { listSpamTokens } from "./gmail";

/**
 * Isındırma (warm-up). Isındırmaya katılan ve onay veren gönderici adresleri bir havuz oluşturur; her adres günlük kotası kadar
 * havuzdaki başka bir adrese kısa, doğal bir e-posta gönderir. Alıcı adres iletiyi gelen kutusunda bulursa kaydeder (ve çoğunlukla
 * yanıtlar), spam'de bulursa (IMAP ise) gelen kutusuna taşır. Sonuçlar gönderen adresin ısınma skorunu verir.
 * Isındırma e-postaları kampanya limitlerine ve kampanya kayıtlarına karışmaz.
 */

export const WARMUP_HEADER = "X-Adspine-Warmup";
const REPLY_CHANCE = 0.6;
/** Isındırma yalnızca bu saatlerde (İstanbul) gönderilir: gece e-postası doğal görünmez. */
const WINDOW: Schedule = { tz: "Europe/Istanbul", days: [1, 2, 3, 4, 5, 6, 7], start: "08:30", end: "20:30" };
const TICK_MINUTES = 5;

const unavailable = (e: { code?: string; message: string } | null) => {
  if (!e) return;
  throw new Error(e.message);
};

type PoolRow = { id: string; user_uid: string; email: string; from_name: string | null; warmup_started_at: string | null };

/** Havuza katılan (açık, onaylı, bağlı) adresler. */
async function pool(): Promise<PoolRow[]> {
  const { data, error } = await db()
    .from("outreach_mailboxes")
    .select("id, user_uid, email, from_name, warmup_started_at")
    .eq("warmup_enabled", true)
    .eq("status", "bagli")
    .not("warmup_consent_at", "is", null)
    .returns<PoolRow[]>();
  unavailable(error);
  return data ?? [];
}

type SentRow = { sender_mailbox_id: string; receiver_mailbox_id: string | null; status: WarmupStatus; sent_at: string };

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

/** Havuzdaki her adres için: günlük kotası dolmadıysa (ve saat uygunsa) bir eşe ısındırma e-postası gönderir. */
export async function runWarmupSend(opts: { force?: boolean; rng?: () => number; now?: Date } = {}): Promise<{ sent: number; skipped: number; failed: number }> {
  const rng = opts.rng ?? Math.random;
  const now = opts.now ?? new Date();
  const res = { sent: 0, skipped: 0, failed: 0 };
  const members = await pool();
  if (members.length < 2 || (!opts.force && !isWithinWindow(now, WINDOW))) return { ...res, skipped: members.length };

  const { data: recent, error } = await db()
    .from("outreach_warmup_messages")
    .select("sender_mailbox_id, receiver_mailbox_id, status, sent_at")
    .gte("sent_at", ago(7 * 86_400_000))
    .in("sender_mailbox_id", members.map((m) => m.id))
    .returns<SentRow[]>();
  unavailable(error);
  const rows = recent ?? [];

  // Kalan pencere: bu saatten bitiş saatine kaç tick var (gönderimler güne yayılsın).
  const [eh, em] = WINDOW.end.split(":").map(Number);
  const tz = new Intl.DateTimeFormat("en-GB", { timeZone: WINDOW.tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const nowMin = Number(tz.find((p) => p.type === "hour")!.value) * 60 + Number(tz.find((p) => p.type === "minute")!.value);
  const ticksLeft = Math.max(Math.floor((eh * 60 + em - nowMin) / TICK_MINUTES), 1);

  for (const sender of members) {
    const mine = rows.filter((r) => r.sender_mailbox_id === sender.id);
    const today = mine.filter((r) => now.getTime() - Date.parse(r.sent_at) < 86_400_000).length;
    const left = warmupQuota(daysSince(sender.warmup_started_at, now.getTime())) - today;
    if (left <= 0) continue;
    if (!opts.force && rng() >= Math.min(left / ticksLeft, 1)) continue;

    // Eş seçimi: kendisi hariç; en az yazışılan eşler öncelikli (aynı eşe üst üste yazılmaz).
    const peers = members.filter((m) => m.id !== sender.id);
    const counts = new Map(peers.map((p) => [p.id, mine.filter((r) => r.receiver_mailbox_id === p.id).length]));
    const least = Math.min(...peers.map((p) => counts.get(p.id)!));
    const candidates = peers.filter((p) => counts.get(p.id) === least);
    const peer = candidates[Math.floor(rng() * candidates.length)];
    try {
      await sendWarmup(sender, peer, rng);
      res.sent++;
    } catch (e) {
      res.failed++;
      console.error("Isındırma gönderilemedi:", e instanceof Error ? e.message : e);
    }
  }
  return res;
}

async function sendWarmup(sender: PoolRow, peer: PoolRow, rng: () => number) {
  const creds = await getMailboxCredentials(sender.user_uid, sender.id);
  if (!creds) throw new Error("Gönderici bulunamadı");
  const token = newWarmupToken();
  const domain = sender.email.slice(sender.email.lastIndexOf("@") + 1);
  const messageId = newMessageId(domain);
  const msg = warmupMessage(peer.from_name, sender.from_name, rng);
  try {
    const sent = await deliver(creds.mailbox, creds.password, {
      from: sender.from_name ? { name: sender.from_name, address: sender.email } : sender.email,
      to: peer.email,
      subject: msg.subject,
      text: msg.text,
      messageId,
      headers: { [WARMUP_HEADER]: token },
    });
    const ins = await db()
      .from("outreach_warmup_messages")
      .insert({ sender_mailbox_id: sender.id, receiver_mailbox_id: peer.id, token, message_id: (sent.messageId || messageId).replace(/^<|>$/g, ""), subject: msg.subject });
    unavailable(ins.error);
  } catch (e) {
    if (classifySmtpFailure(e) === "kimlik") {
      await db().from("outreach_mailboxes").update({ status: "hata", last_error: friendlySmtpError(e, creds.mailbox.provider).slice(0, 300) }).eq("id", sender.id);
    }
    throw e;
  }
}

/**
 * Havuzdaki bir adres bir ısındırma e-postası aldı (gelen kutusunda). Ulaştığı kaydedilir; çoğunlukla kısa bir yanıt gönderilir.
 * Aynı ileti tekrar işlenirse bir şey yapmaz.
 */
export async function onWarmupArrival(receiver: { id: string; user_uid: string }, token: string, rng: () => number = Math.random): Promise<void> {
  const { data: w } = await db()
    .from("outreach_warmup_messages")
    .select("id, status, message_id, subject, sender_mailbox_id, receiver_mailbox_id")
    .eq("token", token)
    .maybeSingle<{ id: string; status: WarmupStatus; message_id: string; subject: string; sender_mailbox_id: string; receiver_mailbox_id: string | null }>();
  if (!w || w.receiver_mailbox_id !== receiver.id || w.status === "yanitlandi") return;

  const first = w.status === "gonderildi";
  await db().from("outreach_warmup_messages").update({ status: "gelen_kutusu", delivered_at: new Date().toISOString() }).eq("id", w.id).in("status", ["gonderildi", "spam", "kayip"]);
  if (!first || rng() >= REPLY_CHANCE) return;

  try {
    const creds = await getMailboxCredentials(receiver.user_uid, receiver.id);
    const peer = await db().from("outreach_mailboxes").select("email, from_name").eq("id", w.sender_mailbox_id).maybeSingle<{ email: string; from_name: string | null }>();
    if (!creds || !peer.data) return;
    const domain = creds.mailbox.email.slice(creds.mailbox.email.lastIndexOf("@") + 1);
    await deliver(creds.mailbox, creds.password, {
      from: creds.mailbox.fromName ? { name: creds.mailbox.fromName, address: creds.mailbox.email } : creds.mailbox.email,
      to: peer.data.email,
      subject: /^re:/i.test(w.subject) ? w.subject : `Re: ${w.subject}`,
      text: warmupReply(peer.data.from_name, creds.mailbox.fromName, rng),
      messageId: newMessageId(domain),
      inReplyTo: `<${w.message_id}>`,
      references: [`<${w.message_id}>`],
      headers: { "X-Adspine-Warmup-Reply": token },
    });
    await db().from("outreach_warmup_messages").update({ status: "yanitlandi", replied_at: new Date().toISOString() }).eq("id", w.id);
  } catch (e) {
    console.error("Isındırma yanıtı gönderilemedi:", e instanceof Error ? e.message : e);
  }
}

/** Spam klasöründe bulunan ısındırma iletilerini "spam" olarak işaretler. */
async function markSpam(receiverId: string, tokens: string[]) {
  if (tokens.length === 0) return;
  await db().from("outreach_warmup_messages").update({ status: "spam", delivered_at: new Date().toISOString() }).eq("receiver_mailbox_id", receiverId).in("token", tokens).eq("status", "gonderildi");
}

/**
 * Alıcı adresin spam klasöründeki ısındırma iletilerini bulur. IMAP ise gelen kutusuna taşır (spam filtresine "bu güvenli" sinyali);
 * Google OAuth bağlantısında yalnızca okuma izni olduğundan taşınamaz, yalnızca ölçülür.
 */
export async function rescueSpam(row: { id: string; user_uid: string; provider: string }): Promise<{ found: number; moved: number }> {
  if (row.provider === "google") {
    const creds = await getMailboxCredentials(row.user_uid, row.id);
    if (!creds) return { found: 0, moved: 0 };
    const tokens = await listSpamTokens(creds.password);
    await markSpam(row.id, tokens);
    return { found: tokens.length, moved: 0 };
  }
  const creds = await getMailboxCredentials(row.user_uid, row.id);
  if (!creds) return { found: 0, moved: 0 };
  return withImap({ ...creds.mailbox.imap, user: creds.mailbox.username, pass: creds.password }, async (client) => {
    const boxes = await client.list();
    const junk = boxes.find((b) => b.specialUse === "\\Junk") ?? boxes.find((b) => /^(junk|spam|bulk)/i.test(b.name));
    if (!junk) return { found: 0, moved: 0 };
    const lock = await client.getMailboxLock(junk.path);
    try {
      const uids = (await client.search({ header: { [WARMUP_HEADER.toLowerCase()]: true }, since: new Date(Date.now() - 3 * 86_400_000) }, { uid: true })) || [];
      if (uids.length === 0) return { found: 0, moved: 0 };
      const tokens: string[] = [];
      for await (const m of client.fetch(uids, { headers: [WARMUP_HEADER.toLowerCase()] }, { uid: true })) {
        const t = /x-adspine-warmup:\s*([a-f0-9]{16,64})/i.exec(m.headers?.toString() ?? "")?.[1];
        if (t) tokens.push(t);
      }
      await markSpam(row.id, tokens);
      await client.messageMove(uids, "INBOX", { uid: true });
      return { found: tokens.length, moved: uids.length };
    } finally {
      lock.release();
    }
  });
}

/** Uzun süredir "yolda" kalan iletileri kayıp sayar. */
export async function markLost(): Promise<number> {
  const { data, error } = await db().from("outreach_warmup_messages").update({ status: "kayip" }).eq("status", "gonderildi").lt("sent_at", ago(LOST_AFTER_MS)).select("id");
  unavailable(error);
  return data?.length ?? 0;
}

/** Havuzdaki adreslerin ısınma skorunu son 14 günün sonuçlarından günceller. */
export async function refreshScores(): Promise<number> {
  const members = await pool();
  let n = 0;
  for (const m of members) {
    const { data } = await db().from("outreach_warmup_messages").select("status").eq("sender_mailbox_id", m.id).gte("sent_at", ago(14 * 86_400_000)).returns<{ status: WarmupStatus }[]>();
    const score = warmupScore((data ?? []).map((r) => r.status));
    await db().from("outreach_mailboxes").update({ warmup_score: score }).eq("id", m.id);
    n++;
  }
  return n;
}

/** Isındırma paneli için son 14 günün özeti. */
export async function warmupStats(mailboxId: string, startedAt: string | null): Promise<WarmupStats> {
  const { data, error } = await db().from("outreach_warmup_messages").select("status, sent_at").eq("sender_mailbox_id", mailboxId).gte("sent_at", ago(14 * 86_400_000)).returns<{ status: WarmupStatus; sent_at: string }[]>();
  unavailable(error);
  return summarize(data ?? [], startedAt);
}

/** Zamanlayıcı: gönder, kayıpları işaretle, skorları güncelle. */
export async function runWarmupTick(): Promise<{ sent: number; failed: number; lost: number; scored: number }> {
  const send = await runWarmupSend();
  const lost = await markLost();
  const scored = await refreshScores();
  return { sent: send.sent, failed: send.failed, lost, scored };
}
