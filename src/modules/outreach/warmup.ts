import "server-only";
import { db } from "@/lib/supabase/server";
import { deliver } from "./mailer";
import { withImap } from "./imap";
import { getMailboxCredentials } from "./mailboxes";
import { newMessageId } from "./mime";
import { isWithinWindow } from "./schedule";
import { friendlySmtpError } from "./smtp";
import { newWarmupToken, warmupMessage, warmupReply } from "./warmup-bank";
import { dayStartMs, daysSince, LOST_AFTER_MS, summarize, WARMUP_WINDOW, warmupDue, warmupQuota, warmupScore, type WarmupStats, type WarmupStatus } from "./warmup-rules";
import { classifySmtpFailure } from "./sender";
import { listSpamTokens } from "./gmail";

/**
 * Isındırma (warm-up). Isındırmaya katılan ve onay veren gönderici adresleri bir havuz oluşturur; her adres günlük kotası kadar
 * havuzdaki başka bir adrese kısa, doğal bir e-posta gönderir. Alıcı adres iletiyi gelen kutusunda bulursa kaydeder (ve çoğunlukla
 * yanıtlar), spam'de bulursa (IMAP ise) gelen kutusuna taşır. Sonuçlar gönderen adresin ısınma skorunu verir.
 * Isındırma e-postaları otomasyon limitlerine ve otomasyon kayıtlarına karışmaz.
 */

export const WARMUP_HEADER = "X-Adspine-Warmup";
const REPLY_CHANCE = 0.6;

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

/** Eş seçimi: kendisi hariç; en az yazışılan eşler öncelikli (aynı eşe üst üste yazılmaz). */
function choosePeer(sender: PoolRow, members: PoolRow[], mine: SentRow[], rng: () => number): PoolRow {
  const peers = members.filter((m) => m.id !== sender.id);
  const counts = new Map(peers.map((p) => [p.id, mine.filter((r) => r.receiver_mailbox_id === p.id).length]));
  const least = Math.min(...peers.map((p) => counts.get(p.id)!));
  const candidates = peers.filter((p) => counts.get(p.id) === least);
  return candidates[Math.floor(rng() * candidates.length)];
}

/** Havuzdaki her adres için: günlük kotası dolmadıysa ve takvimdeki sırası geldiyse bir eşe ısındırma e-postası gönderir. */
export async function runWarmupSend(opts: { rng?: () => number; now?: Date } = {}): Promise<{ sent: number; skipped: number; failed: number }> {
  const rng = opts.rng ?? Math.random;
  const now = opts.now ?? new Date();
  const res = { sent: 0, skipped: 0, failed: 0 };
  const members = await pool();
  if (members.length < 2 || !isWithinWindow(now, WARMUP_WINDOW)) return { ...res, skipped: members.length };

  const { data: recent, error } = await db()
    .from("outreach_warmup_messages")
    .select("sender_mailbox_id, receiver_mailbox_id, status, sent_at")
    .gte("sent_at", ago(7 * 86_400_000))
    .in("sender_mailbox_id", members.map((m) => m.id))
    .returns<SentRow[]>();
  unavailable(error);
  const rows = recent ?? [];

  for (const sender of members) {
    const mine = rows.filter((r) => r.sender_mailbox_id === sender.id);
    const sentToday = mine.filter((r) => Date.parse(r.sent_at) >= dayStartMs(now.getTime())).length;
    const quota = warmupQuota(daysSince(sender.warmup_started_at, now.getTime()));
    if (!warmupDue({ quota, sentToday, now })) {
      res.skipped++;
      continue;
    }
    try {
      await sendWarmup(sender, choosePeer(sender, members, mine, rng), rng);
      res.sent++;
    } catch (e) {
      res.failed++;
      console.error("Isındırma gönderilemedi:", e instanceof Error ? e.message : e);
    }
  }
  return res;
}

export type FirstSend = { result: "sent" | "alone" | "limit" | "error"; message: string };

/**
 * Isındırma açılır açılmaz (ya da kullanıcı isteyince) bir adresten hemen bir ısındırma e-postası gönderir; saat penceresine bakmaz,
 * günlük kotayı aşmaz. Amaç, kurulumun çalıştığını beklemeden göstermek ve bir sorun varsa nedenini söylemektir.
 */
export async function sendWarmupNow(uid: string, mailboxId: string, rng: () => number = Math.random): Promise<FirstSend> {
  const members = await pool();
  const sender = members.find((m) => m.id === mailboxId && m.user_uid === uid);
  if (!sender) return { result: "error", message: "Isındırma bu adres için açık değil." };
  if (members.length < 2) return { result: "alone", message: "Havuzda eşleşecek başka bir adres yok; biri katılınca ısındırma kendiliğinden başlar." };

  const { data, error } = await db()
    .from("outreach_warmup_messages")
    .select("sender_mailbox_id, receiver_mailbox_id, status, sent_at")
    .eq("sender_mailbox_id", sender.id)
    .gte("sent_at", ago(7 * 86_400_000))
    .returns<SentRow[]>();
  unavailable(error);
  const mine = data ?? [];
  const sentToday = mine.filter((r) => Date.parse(r.sent_at) >= dayStartMs()).length;
  if (sentToday >= warmupQuota(daysSince(sender.warmup_started_at))) return { result: "limit", message: "Bugünkü ısındırma kotası doldu; yarın sürer." };
  try {
    await sendWarmup(sender, choosePeer(sender, members, mine, rng), rng);
    return { result: "sent", message: "Isındırma e-postası gönderildi." };
  } catch (e) {
    const row = await db().from("outreach_mailboxes").select("provider").eq("id", sender.id).maybeSingle<{ provider: "gmail" | "outlook" | "ozel" | "google" }>();
    return { result: "error", message: friendlySmtpError(e, row.data?.provider ?? "ozel").slice(0, 300) };
  }
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

export type WarmupOverview = WarmupStats & {
  /** Havuzdaki bu adres dışındaki açık adresler: 0 ise ısındırma başlayamaz. */
  peers: number;
  /** Şu an gönderim saati içinde mi (08:30-20:30 İstanbul)? */
  inWindow: boolean;
  lastSentAt: string | null;
};

/** Isındırma paneli için son 14 günün özeti ve çalışma durumu. */
export async function warmupStats(mailboxId: string, startedAt: string | null): Promise<WarmupOverview> {
  const [msgs, members] = await Promise.all([
    db().from("outreach_warmup_messages").select("status, sent_at").eq("sender_mailbox_id", mailboxId).gte("sent_at", ago(14 * 86_400_000)).order("sent_at", { ascending: false }).returns<{ status: WarmupStatus; sent_at: string }[]>(),
    pool(),
  ]);
  unavailable(msgs.error);
  const rows = msgs.data ?? [];
  return { ...summarize(rows, startedAt), peers: members.filter((m) => m.id !== mailboxId).length, inWindow: isWithinWindow(new Date(), WARMUP_WINDOW), lastSentAt: rows[0]?.sent_at ?? null };
}

/** Zamanlayıcının bakım adımı (gelen kutusu taramasından sonra): kayıpları işaretle, skorları güncelle. */
export async function runWarmupMaintenance(): Promise<{ lost: number; scored: number }> {
  const lost = await markLost();
  const scored = await refreshScores();
  return { lost, scored };
}
