import "server-only";
import { db } from "@/lib/supabase/server";
import { chatJson } from "@/lib/llm/nvidia";
import { OutreachUnavailableError } from "./contacts";
import { deliver } from "./mailer";
import { getMailboxCredentials } from "./mailboxes";
import { newMessageId } from "./mime";
import { classifyReplyText, previewOf } from "./reply-rules";
import { friendlySmtpError } from "./smtp";
import { leadStatusValues, type Conversation, type InboxCounts, type LeadStatus, type ThreadMessage } from "./unibox-options";

/**
 * Gelen kutusu (Unibox): otomasyon e-postalarına gelen yanıtlar kişi (kayıt) başına bir konuşmada toplanır. Yanıt gelince
 * saklanır, durum etiketi otomatik atanır (kurallar, olmazsa yapay zekâ); kullanıcı etiketi değiştirebilir ve yanıt yazabilir.
 */

const unavailable = (e: { code?: string; message: string } | null) => {
  if (!e) return;
  if (e.code === "42P01" || e.code === "PGRST205" || e.code === "42703") throw new OutreachUnavailableError();
  throw new Error(e.message);
};

/** Kurallar karar veremezse modele sorar (en iyi çaba; hata ya da belirsizlikte null). */
async function aiLabel(text: string): Promise<LeadStatus | null> {
  const body = text.trim();
  if (body.length < 8) return null;
  try {
    const raw = (await chatJson(
      [
        { role: "system", content: 'Bir soğuk satış e-postasına gelen yanıtı etiketle. Sadece JSON döndür: {"etiket":"ilgili|toplanti|ilgisiz|yanlis_kisi|lead"}. ilgili: ilgi gösteriyor; toplanti: görüşme/toplantı istiyor ya da öneriyor; ilgisiz: istemiyor; yanlis_kisi: yanlış kişi ya da ayrılmış; lead: belirsiz.' },
        { role: "user", content: body.slice(0, 1200) },
      ],
      { maxTokens: 60, timeoutMs: 8000, thinking: false, temperature: 0 },
    )) as { etiket?: string };
    return leadStatusValues.includes(raw?.etiket as LeadStatus) ? (raw.etiket as LeadStatus) : null;
  } catch {
    return null;
  }
}

export type IncomingReply = {
  uid: string;
  mailboxId: string;
  enrollmentId: string;
  sequenceId: string | null;
  contactId: string | null;
  messageId: string;
  inReplyTo: string | null;
  fromEmail: string;
  fromName: string | null;
  subject: string;
  body: string;
  kind: "yanit" | "ooo";
};

/** Gelen yanıtı saklar, konuşmayı okunmamış yapar ve (elle değiştirilmemişse) durum etiketini atar. Tekrarlar yok sayılır. */
export async function storeReply(r: IncomingReply): Promise<void> {
  const ins = await db()
    .from("outreach_replies")
    .upsert(
      {
        user_uid: r.uid,
        mailbox_id: r.mailboxId,
        sequence_id: r.sequenceId,
        enrollment_id: r.enrollmentId,
        contact_id: r.contactId,
        message_id: r.messageId.replace(/^<|>$/g, ""),
        in_reply_to: r.inReplyTo?.replace(/^<|>$/g, "") ?? null,
        from_email: r.fromEmail,
        from_name: r.fromName?.slice(0, 160) ?? null,
        subject: r.subject.slice(0, 300),
        body_text: r.body.slice(0, 30000),
        kind: r.kind,
      },
      { onConflict: "user_uid,message_id", ignoreDuplicates: true },
    )
    .select("id");
  unavailable(ins.error);
  if (!ins.data?.length) return; // zaten saklı

  const cur = await db().from("outreach_enrollments").select("lead_status").eq("id", r.enrollmentId).maybeSingle<{ lead_status: LeadStatus }>();
  const patch: Record<string, unknown> = { last_reply_at: new Date().toISOString(), read_at: null };
  const status = cur.data?.lead_status ?? "lead";
  if (r.kind === "ooo") {
    if (status === "lead") patch.lead_status = "ofis_disi";
  } else if (status === "lead" || status === "ofis_disi") {
    patch.lead_status = classifyReplyText(r.body) ?? (await aiLabel(r.body)) ?? "lead";
  }
  const up = await db().from("outreach_enrollments").update(patch).eq("id", r.enrollmentId);
  unavailable(up.error);
}

type EnrollRow = {
  id: string;
  lead_status: LeadStatus;
  last_reply_at: string;
  read_at: string | null;
  sequence_id: string;
  mailbox_id: string | null;
  root_subject: string | null;
  outreach_contacts: { id: string; name: string | null; company: string | null; email: string | null } | null;
  outreach_sequences: { id: string; name: string } | null;
};

export type InboxFilter = { status?: LeadStatus | "hepsi"; unreadOnly?: boolean; sequenceId?: string; mailboxId?: string; q?: string };

const emptyCounts = (): InboxCounts => ({ ...(Object.fromEntries(leadStatusValues.map((s) => [s, 0])) as Record<LeadStatus, number>), toplam: 0, okunmamis: 0 });

const isUnread = (e: Pick<EnrollRow, "last_reply_at" | "read_at">) => !e.read_at || Date.parse(e.read_at) < Date.parse(e.last_reply_at);

/** Konuşma listesi ve sayaçlar. En son yanıt gelen en üstte. */
export async function listConversations(uid: string, f: InboxFilter = {}): Promise<{ conversations: Conversation[]; counts: InboxCounts }> {
  const { data, error } = await db()
    .from("outreach_enrollments")
    .select("id, lead_status, last_reply_at, read_at, sequence_id, mailbox_id, root_subject, outreach_contacts(id, name, company, email), outreach_sequences(id, name)")
    .eq("user_uid", uid)
    .not("last_reply_at", "is", null)
    .order("last_reply_at", { ascending: false })
    .limit(500)
    .returns<EnrollRow[]>();
  unavailable(error);
  const all = data ?? [];

  const counts = emptyCounts();
  for (const e of all) {
    counts[e.lead_status]++;
    counts.toplam++;
    if (isUnread(e)) counts.okunmamis++;
  }

  const q = f.q?.trim().toLowerCase();
  const rows = all
    .filter((e) => (f.status && f.status !== "hepsi" ? e.lead_status === f.status : true))
    .filter((e) => (f.unreadOnly ? isUnread(e) : true))
    .filter((e) => (f.sequenceId ? e.sequence_id === f.sequenceId : true))
    .filter((e) => (f.mailboxId ? e.mailbox_id === f.mailboxId : true))
    .filter((e) => (q ? [e.outreach_contacts?.name, e.outreach_contacts?.company, e.outreach_contacts?.email].some((v) => v?.toLowerCase().includes(q)) : true))
    .slice(0, 100);

  const last = new Map<string, { subject: string; body: string }>();
  if (rows.length > 0) {
    const rep = await db()
      .from("outreach_replies")
      .select("enrollment_id, subject, body_text, received_at")
      .eq("user_uid", uid)
      .in("enrollment_id", rows.map((r) => r.id))
      .order("received_at", { ascending: false })
      .limit(1000)
      .returns<{ enrollment_id: string; subject: string; body_text: string }[]>();
    unavailable(rep.error);
    for (const r of rep.data ?? []) if (!last.has(r.enrollment_id)) last.set(r.enrollment_id, { subject: r.subject, body: r.body_text });
  }

  return {
    counts,
    conversations: rows.map((e) => ({
      id: e.id,
      status: e.lead_status,
      unread: isUnread(e),
      lastReplyAt: e.last_reply_at,
      snippet: previewOf(last.get(e.id)?.body ?? ""),
      subject: last.get(e.id)?.subject || e.root_subject || "",
      contact: { id: e.outreach_contacts?.id ?? null, name: e.outreach_contacts?.name ?? null, company: e.outreach_contacts?.company ?? null, email: e.outreach_contacts?.email ?? null },
      campaign: { id: e.outreach_sequences?.id ?? null, name: e.outreach_sequences?.name ?? null },
      mailboxId: e.mailbox_id,
    })),
  };
}

async function ownEnrollment(uid: string, id: string) {
  const { data, error } = await db()
    .from("outreach_enrollments")
    .select("id, lead_status, last_reply_at, read_at, sequence_id, mailbox_id, root_subject, thread_root, last_message_id, contact_id, outreach_contacts(id, name, company, email), outreach_sequences(id, name)")
    .eq("user_uid", uid)
    .eq("id", id)
    .maybeSingle<EnrollRow & { thread_root: string | null; last_message_id: string | null; contact_id: string }>();
  unavailable(error);
  return data;
}

/** Konuşmanın tüm iletileri (gönderilenler ve gelenler, zaman sırasıyla). Açıldığında okundu işaretlenir. */
export async function getThread(uid: string, enrollmentId: string): Promise<{ conversation: Conversation; messages: ThreadMessage[] } | null> {
  const e = await ownEnrollment(uid, enrollmentId);
  if (!e) return null;

  const [out, inn] = await Promise.all([
    db().from("outreach_messages").select("id, subject, body_text, sent_at, step_id").eq("user_uid", uid).eq("enrollment_id", enrollmentId).neq("status", "hata").order("sent_at", { ascending: true }).returns<{ id: string; subject: string; body_text: string; sent_at: string; step_id: string | null }[]>(),
    db().from("outreach_replies").select("id, subject, body_text, received_at, from_email, from_name, kind").eq("user_uid", uid).eq("enrollment_id", enrollmentId).order("received_at", { ascending: true }).returns<{ id: string; subject: string; body_text: string; received_at: string; from_email: string; from_name: string | null; kind: "yanit" | "ooo" }[]>(),
  ]);
  unavailable(out.error);
  unavailable(inn.error);

  const mailbox = e.mailbox_id ? await db().from("outreach_mailboxes").select("email").eq("id", e.mailbox_id).maybeSingle<{ email: string }>() : null;
  const messages: ThreadMessage[] = [
    ...(out.data ?? []).map((m): ThreadMessage => ({ id: m.id, direction: "giden", kind: m.step_id ? "kampanya" : "elle", from: mailbox?.data?.email ?? "siz", subject: m.subject, body: m.body_text, at: m.sent_at })),
    ...(inn.data ?? []).map((m): ThreadMessage => ({ id: m.id, direction: "gelen", kind: m.kind, from: m.from_name ? `${m.from_name} <${m.from_email}>` : m.from_email, subject: m.subject, body: m.body_text, at: m.received_at })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  await db().from("outreach_enrollments").update({ read_at: new Date().toISOString() }).eq("id", enrollmentId).eq("user_uid", uid);
  const last = [...messages].reverse().find((m) => m.direction === "gelen");
  return {
    messages,
    conversation: {
      id: e.id,
      status: e.lead_status,
      unread: false,
      lastReplyAt: e.last_reply_at,
      snippet: previewOf(last?.body ?? ""),
      subject: last?.subject || e.root_subject || "",
      contact: { id: e.outreach_contacts?.id ?? null, name: e.outreach_contacts?.name ?? null, company: e.outreach_contacts?.company ?? null, email: e.outreach_contacts?.email ?? null },
      campaign: { id: e.outreach_sequences?.id ?? null, name: e.outreach_sequences?.name ?? null },
      mailboxId: e.mailbox_id,
    },
  };
}

export async function setLeadStatus(uid: string, enrollmentId: string, status: LeadStatus): Promise<boolean> {
  const { data, error } = await db().from("outreach_enrollments").update({ lead_status: status }).eq("user_uid", uid).eq("id", enrollmentId).select("id");
  unavailable(error);
  return (data?.length ?? 0) > 0;
}

export async function setUnread(uid: string, enrollmentId: string, unread: boolean): Promise<boolean> {
  const { data, error } = await db().from("outreach_enrollments").update({ read_at: unread ? null : new Date().toISOString() }).eq("user_uid", uid).eq("id", enrollmentId).select("id");
  unavailable(error);
  return (data?.length ?? 0) > 0;
}

export class ReplyError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

/** Yanıtın konusu: "Re: ..." (zaten varsa tekrarlanmaz). */
export const replySubject = (subject: string) => (/^(re|yanıt):/i.test(subject.trim()) ? subject.trim() : `Re: ${subject.trim() || "(konu yok)"}`);

/** Konuşmaya, otomasyonun gönderici adresinden yanıt yazar. Aynı konuşmada görünmesi için başlıklar zincirlenir. */
export async function sendReply(uid: string, enrollmentId: string, body: string): Promise<ThreadMessage> {
  const e = await ownEnrollment(uid, enrollmentId);
  if (!e) throw new ReplyError("Konuşma bulunamadı.", 404);
  if (!e.mailbox_id) throw new ReplyError("Bu konuşmanın gönderici adresi artık bağlı değil.", 409);
  const creds = await getMailboxCredentials(uid, e.mailbox_id);
  if (!creds) throw new ReplyError("Gönderici adresi bulunamadı.", 409);
  if (creds.mailbox.status === "hata") throw new ReplyError("Gönderici adresinin bağlantısı bozuk. Gönderici adreslerinden yeniden bağlayın.", 409);

  const lastIn = await db().from("outreach_replies").select("message_id, from_email, subject").eq("user_uid", uid).eq("enrollment_id", enrollmentId).eq("kind", "yanit").order("received_at", { ascending: false }).limit(1).maybeSingle<{ message_id: string; from_email: string; subject: string }>();
  unavailable(lastIn.error);
  const to = lastIn.data?.from_email ?? e.outreach_contacts?.email;
  if (!to) throw new ReplyError("Alıcı adresi bulunamadı.", 409);

  const domain = creds.mailbox.email.slice(creds.mailbox.email.lastIndexOf("@") + 1);
  const messageId = newMessageId(domain);
  const subject = replySubject(lastIn.data?.subject || e.root_subject || "");
  const inReplyTo = lastIn.data ? `<${lastIn.data.message_id}>` : e.last_message_id ? `<${e.last_message_id}>` : undefined;
  const references = [e.thread_root, e.last_message_id, lastIn.data?.message_id].filter((v, i, a): v is string => Boolean(v) && a.indexOf(v) === i).map((v) => `<${v}>`);
  const text = [body.trim(), creds.mailbox.signature.trim()].filter(Boolean).join("\n\n") + "\n";

  let sent: { messageId: string };
  try {
    sent = await deliver(creds.mailbox, creds.password, {
      from: creds.mailbox.fromName ? { name: creds.mailbox.fromName, address: creds.mailbox.email } : creds.mailbox.email,
      to,
      subject,
      text,
      messageId,
      inReplyTo,
      references: references.length ? references : undefined,
    });
  } catch (err) {
    throw new ReplyError(friendlySmtpError(err, creds.mailbox.provider), 422);
  }

  const bare = (sent.messageId || messageId).replace(/^<|>$/g, "");
  const row = await db()
    .from("outreach_messages")
    .insert({ user_uid: uid, sequence_id: e.sequence_id, enrollment_id: e.id, contact_id: e.contact_id, mailbox_id: e.mailbox_id, message_id: bare, in_reply_to: lastIn.data?.message_id ?? null, to_email: to, subject, body_text: body.trim() })
    .select("id, sent_at")
    .single<{ id: string; sent_at: string }>();
  unavailable(row.error);
  await db().from("outreach_enrollments").update({ read_at: new Date().toISOString() }).eq("id", e.id);
  return { id: row.data!.id, direction: "giden", kind: "elle", from: creds.mailbox.email, subject, body: body.trim(), at: row.data!.sent_at };
}
