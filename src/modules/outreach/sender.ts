import "server-only";
import { db } from "@/lib/supabase/server";
import { site } from "@/lib/site";
import { createPlan } from "@/modules/plan/repository";
import { writeOpener } from "./ai";
import { addSuppression, OutreachUnavailableError, getContact } from "./contacts";
import { decryptSecret, signToken } from "./crypto";
import { addEvent, claimDue, finishContactEnrollments, isSuppressedIn, suppressionSets, updateEnrollment, type EnrollmentRow, type FinishReason } from "./enrollments";
import { mailboxCapacity, campaignCapacity, type Counts } from "./limits";
import { buildOutgoing, newMessageId, threadSubject } from "./mime";
import { buildVars, renderTemplate, type RenderVars } from "./render";
import { isWithinWindow, jitter, nextRunAt, nextWindowStart } from "./schedule";
import type { Sequence, Step, Variant } from "./sequence-schema";
import { getSequence } from "./sequences";
import { friendlySmtpError, sendMail, type SmtpConfig } from "./smtp";
import type { Mailbox } from "./mailbox-schema";
import type { SenderContext } from "./ai-prompts";

/**
 * Gönderici (zamanlayıcının "tick"i): vadesi gelen kampanya kayıtlarını kilitler, her biri için pencere, limit ve kurallara
 * bakar, e-postayı doğru posta kutusundan gönderir ve bir sonraki adımı planlar. Her çağrı sınırlı iş yapar (zaman aşımına karşı).
 */

export type TickResult = { claimed: number; sent: number; tasks: number; deferred: number; finished: number; failed: number; bounced: number };

const DEFER_NO_CAPACITY_MIN = 15;
const AI_BUDGET_PER_TICK = 4;
const MAX_ATTEMPTS = 4;
const BACKOFF_MIN = [5, 15, 60, 180];

/** Aynı kişi aynı varyantı alsın, dağılım yaklaşık eşit olsun: kayıt ve adım kimliğinden kararlı bir sayı. */
export function pickVariant(variants: Variant[], enrollmentId: string, stepId: string): Variant {
  if (variants.length === 1) return variants[0];
  let h = 0;
  for (const c of `${enrollmentId}:${stepId}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return variants[h % variants.length];
}

/** Açılış cümlesini selamlama satırından sonra (yoksa en başa) yerleştirir. */
export function insertOpener(body: string, opener: string): string {
  const lines = body.split("\n");
  const first = lines[0]?.trim() ?? "";
  if (first && first.length < 60 && /[,]$/.test(first)) return [lines[0], "", opener, ...lines.slice(1)].join("\n").replace(/\n{3,}/g, "\n\n");
  return `${opener}\n\n${body}`;
}

/** SMTP hatasının kalıcı bir alıcı reddi (adres yok) mu, geçici mi, kimlik doğrulama mı olduğunu ayırır. */
export function classifySmtpFailure(e: unknown): "alici_yok" | "kimlik" | "gecici" {
  const err = e as { code?: string; responseCode?: number; response?: string; message?: string };
  if (err.code === "EAUTH" || err.responseCode === 535 || err.responseCode === 534) return "kimlik";
  const text = `${err.response ?? ""} ${err.message ?? ""}`;
  if ((err.responseCode && [550, 551, 553, 554].includes(err.responseCode) && /user|recipient|mailbox|address|account|no such|unknown|does not exist|invalid/i.test(text)) || /5\.1\.[01]\b/.test(text)) return "alici_yok";
  return "gecici";
}

type Ctx = {
  sequences: Map<string, Sequence | null>;
  mailboxes: Map<string, { mailbox: Mailbox; password: string }[]>;
  counts: Map<string, Counts>;
  campaign24h: Map<string, number>;
  senders: Map<string, { name: string | null; company: string | null; context: SenderContext }>;
  suppressions: Map<string, Awaited<ReturnType<typeof suppressionSets>>>;
  aiBudget: number;
};

async function loadMailboxes(uid: string, ctx: Ctx) {
  const cached = ctx.mailboxes.get(uid);
  if (cached) return cached;
  const { data, error } = await db().from("outreach_mailboxes").select("*").eq("user_uid", uid).eq("status", "bagli");
  if (error) throw error.code === "42P01" || error.code === "PGRST205" ? new OutreachUnavailableError() : new Error(error.message);
  const list = (data ?? []).map((r) => ({
    mailbox: {
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
    } as Mailbox,
    password: decryptSecret(r.secret_enc),
  }));
  ctx.mailboxes.set(uid, list);

  // Kayan saatlik ve 24 saatlik gönderim sayıları (bu tick boyunca bellekte güncel tutulur)
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const sent = await db().from("outreach_messages").select("mailbox_id, sent_at").eq("user_uid", uid).neq("status", "hata").gte("sent_at", since).limit(10000);
  const hourAgo = Date.now() - 3_600_000;
  for (const l of list) {
    const mine = (sent.data ?? []).filter((m) => m.mailbox_id === l.mailbox.id);
    ctx.counts.set(l.mailbox.id, { last24h: mine.length, lastHour: mine.filter((m) => Date.parse(m.sent_at) >= hourAgo).length });
  }
  return list;
}

async function loadSender(uid: string, ctx: Ctx) {
  const cached = ctx.senders.get(uid);
  if (cached) return cached;
  const { data } = await db().from("profiles").select("display_name, business_name, work_type, services, extra").eq("firebase_uid", uid).maybeSingle();
  const name = (data?.display_name as string | null) ?? null;
  const company = (data?.business_name as string | null) ?? null;
  const extra = (data?.extra ?? {}) as { businessDescription?: string };
  const v = {
    name,
    company,
    context: { businessName: company ?? "", firstName: name?.split(" ")[0] ?? null, workType: (data?.work_type as string) ?? "", services: (data?.services as string[]) ?? [], description: extra.businessDescription ?? "" },
  };
  ctx.senders.set(uid, v);
  return v;
}

async function campaignSent24h(seqId: string, ctx: Ctx) {
  const cached = ctx.campaign24h.get(seqId);
  if (cached !== undefined) return cached;
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { count } = await db().from("outreach_messages").select("id", { count: "exact", head: true }).eq("sequence_id", seqId).neq("status", "hata").gte("sent_at", since);
  ctx.campaign24h.set(seqId, count ?? 0);
  return count ?? 0;
}

const release = (id: string, patch: Record<string, unknown> = {}) => updateEnrollment(id, { claimed_until: null, ...patch });

async function finish(en: EnrollmentRow, reason: FinishReason, error?: string) {
  await release(en.id, { status: "bitti", finish_reason: reason, next_run_at: null, last_error: error ?? null });
  await addEvent({ uid: en.user_uid, kind: "bitti", sequenceId: en.sequence_id, enrollmentId: en.id, contactId: en.contact_id, meta: { reason } });
}

/** Sıradaki adıma geçer: gecikme ve gönderim penceresiyle bir sonraki çalışma anını hesaplar; adım kalmadıysa bitirir. */
async function advance(en: EnrollmentRow, seq: Sequence, active: Step[], patch: Record<string, unknown>) {
  const nextIdx = en.current_step + 1;
  const next = active[nextIdx];
  if (!next) {
    await release(en.id, { ...patch, current_step: nextIdx, status: "bitti", finish_reason: "tamamlandi", next_run_at: null, attempts: 0, last_error: null });
    await addEvent({ uid: en.user_uid, kind: "bitti", sequenceId: en.sequence_id, enrollmentId: en.id, contactId: en.contact_id, meta: { reason: "tamamlandi" } });
    return "finished" as const;
  }
  const at = nextRunAt(new Date(), next.delayMinutes, seq.schedule);
  await release(en.id, { ...patch, current_step: nextIdx, next_run_at: (at ?? new Date(Date.now() + 86_400_000)).toISOString(), attempts: 0, last_error: null });
  return "advanced" as const;
}

const unsubscribeLinks = (enrollmentId: string) => {
  const token = signToken(`e:${enrollmentId}`);
  return { unsubscribeUrl: `${site.url}/u/${token}`, oneClickUrl: `${site.url}/api/outreach/unsub/${token}` };
};

/** Manuel adım (arama, görev, WhatsApp, manuel e-posta): Plan'a bir görev düşer ve kampanya sonraki adıma geçer. */
async function runManualStep(en: EnrollmentRow, seq: Sequence, active: Step[], step: Step, ctx: Ctx, res: TickResult) {
  const contact = await getContact(en.user_uid, en.contact_id);
  const sender = await loadSender(en.user_uid, ctx);
  const vars = buildVars(contact ?? { name: null, company: null, city: null, website: null }, sender);
  const labels: Record<string, string> = { arama: "Ara", gorev: "Görev", whatsapp: "WhatsApp'tan yaz", manual_email: "E-posta yaz" };
  const who = contact?.company ?? contact?.name ?? "kişi";
  const title = renderTemplate(step.task.title || `${labels[step.kind] ?? "Görev"}: {{company|${who}}}`, vars).slice(0, 120) || `${labels[step.kind]}: ${who}`;
  const notes = [renderTemplate(step.task.notes, vars), contact?.email && `E-posta: ${contact.email}`, contact?.phone && `Telefon: ${contact.phone}`, `Kampanya: ${seq.name}`].filter(Boolean).join("\n").slice(0, 1000);
  try {
    await createPlan(en.user_uid, {
      kind: step.kind === "arama" ? "arama" : "gorev",
      title,
      details: notes,
      startsAt: new Date().toISOString(),
      endsAt: null,
      allDay: false,
      favoriteId: contact?.favoriteId ?? null,
      withName: (contact?.company ?? contact?.name ?? null)?.slice(0, 80) ?? null,
      location: null,
      done: false,
    });
  } catch (e) {
    // Plan tablosu yoksa ya da dolduysa görev düşmez; kampanya yine de ilerler (kullanıcı olay günlüğünde görür).
    await addEvent({ uid: en.user_uid, kind: "hata", sequenceId: seq.id, enrollmentId: en.id, contactId: en.contact_id, meta: { step: step.kind, error: e instanceof Error ? e.message.slice(0, 120) : "plan" } });
  }
  await addEvent({ uid: en.user_uid, kind: "gorev", sequenceId: seq.id, enrollmentId: en.id, contactId: en.contact_id, meta: { title, kind: step.kind } });
  res.tasks++;
  if ((await advance(en, seq, active, {})) === "finished") res.finished++;
}

async function runEmailStep(en: EnrollmentRow, seq: Sequence, active: Step[], step: Step, ctx: Ctx, res: TickResult) {
  const uid = en.user_uid;
  const contact = await getContact(uid, en.contact_id);
  if (!contact?.email) return void (await finish(en, "gecersiz"), res.finished++);
  if (contact.emailStatus === "gecersiz") return void (await finish(en, "gecersiz"), res.finished++);
  if (contact.emailKind === "kisisel" && !seq.settings.allowPersonal) return void (await finish(en, "elle", "Kişisel adres: kampanya ayarında kapalı."), res.finished++);

  let sup = ctx.suppressions.get(uid);
  if (!sup) ctx.suppressions.set(uid, (sup = await suppressionSets(uid)));
  if (isSuppressedIn(sup, contact.email)) return void (await finish(en, "kara_liste"), res.finished++);

  // ── posta kutusu ve kapasite
  const all = await loadMailboxes(uid, ctx);
  const allowed = all.filter((m) => seq.settings.mailboxIds.length === 0 || seq.settings.mailboxIds.includes(m.mailbox.id));
  const sticky = en.mailbox_id ? allowed.find((m) => m.mailbox.id === en.mailbox_id) : undefined;
  const capOf = (m: { mailbox: Mailbox }) => mailboxCapacity(m.mailbox, ctx.counts.get(m.mailbox.id) ?? { lastHour: 0, last24h: 0 });
  // Takip e-postaları aynı konuşmada kalsın diye ilk adımın posta kutusu korunur; ilk adımda en boş kutu seçilir.
  const chosen = en.thread_root ? sticky : allowed.map((m) => ({ m, cap: capOf(m) })).sort((a, b) => b.cap - a.cap)[0]?.m;
  const campaignCap = campaignCapacity(seq.settings.maxPer24h, await campaignSent24h(seq.id, ctx));
  if (!chosen || capOf(chosen) <= 0 || campaignCap <= 0) {
    const wait = !chosen && en.thread_root ? 60 : DEFER_NO_CAPACITY_MIN;
    await release(en.id, { next_run_at: jitter(new Date(Date.now() + wait * 60_000), 5).toISOString() });
    res.deferred++;
    return;
  }

  // ── içerik
  const sender = await loadSender(uid, ctx);
  const variant = pickVariant(step.variants.filter((v) => v.subject.trim() || v.body.trim()), en.id, step.id) ?? step.variants[0];
  const vars: RenderVars = buildVars(contact, { name: chosen.mailbox.fromName ?? sender.name, company: sender.company });
  let body = renderTemplate(variant.body, vars);
  let subject = renderTemplate(variant.subject, vars);

  if (variant.opener) {
    let opener = en.personalization?.[step.id];
    if (opener === undefined && ctx.aiBudget > 0) {
      ctx.aiBudget--;
      opener = (await writeOpener({ company: contact.company, city: contact.city, website: contact.website, sender: sender.context }).catch(() => null)) ?? "";
      await updateEnrollment(en.id, { personalization: { ...(en.personalization ?? {}), [step.id]: opener } });
    }
    if (opener) body = insertOpener(body, opener);
  }

  const isFollowUp = Boolean(en.thread_root);
  subject = threadSubject(subject, isFollowUp, en.root_subject ?? undefined);
  if (!body.trim() || (!subject.replace(/^Re:\s*/i, "").trim())) {
    await release(en.id, { status: "hata", last_error: "Mesaj ya da konu boş: adımı düzenleyin." });
    await addEvent({ uid, kind: "hata", sequenceId: seq.id, enrollmentId: en.id, contactId: en.contact_id, meta: { error: "bos_mesaj" } });
    res.failed++;
    return;
  }

  const domain = chosen.mailbox.email.slice(chosen.mailbox.email.lastIndexOf("@") + 1);
  const messageId = newMessageId(domain);
  const identity = [chosen.mailbox.fromName ?? sender.name, sender.company, seq.settings.footerAddress].filter(Boolean).join(" · ");
  const mail = buildOutgoing({
    fromName: chosen.mailbox.fromName ?? sender.name,
    fromEmail: chosen.mailbox.email,
    to: contact.email,
    subject,
    body,
    signature: chosen.mailbox.signature,
    includeSignature: seq.settings.includeSignature,
    identity,
    ...unsubscribeLinks(en.id),
    messageId,
    inReplyTo: en.last_message_id ? `<${en.last_message_id}>` : undefined,
    references: en.thread_root ? [`<${en.thread_root}>`, ...(en.last_message_id && en.last_message_id !== en.thread_root ? [`<${en.last_message_id}>`] : [])] : undefined,
    cc: seq.settings.cc,
    bcc: seq.settings.bcc,
  });

  const cfg: SmtpConfig = { ...chosen.mailbox.smtp, user: chosen.mailbox.username, pass: chosen.password };
  try {
    await sendMail(cfg, mail);
  } catch (e) {
    const kind = classifySmtpFailure(e);
    if (kind === "alici_yok") {
      const bare = messageId.replace(/^<|>$/g, "");
      const ins = await db().from("outreach_messages").insert({ user_uid: uid, sequence_id: seq.id, step_id: step.id, enrollment_id: en.id, contact_id: en.contact_id, mailbox_id: chosen.mailbox.id, variant_key: variant.key, message_id: bare, to_email: contact.email, subject, body_text: body, status: "bounce", bounced_at: new Date().toISOString(), error: "Alıcı adresi reddedildi" }).select("id").single();
      await addSuppression(uid, { email: contact.email, reason: "bounce" }).catch(() => undefined);
      await db().from("outreach_contacts").update({ email_status: "gecersiz" }).eq("user_uid", uid).eq("id", en.contact_id);
      await finishContactEnrollments(uid, en.contact_id, "bounce");
      await addEvent({ uid, kind: "bounce", sequenceId: seq.id, enrollmentId: en.id, messageRowId: ins.data?.id ?? null, contactId: en.contact_id, meta: { via: "smtp" } });
      res.bounced++;
      return;
    }
    const message = friendlySmtpError(e, chosen.mailbox.provider).slice(0, 300);
    if (kind === "kimlik") {
      await db().from("outreach_mailboxes").update({ status: "hata", last_error: message }).eq("id", chosen.mailbox.id);
      ctx.mailboxes.set(uid, (ctx.mailboxes.get(uid) ?? []).filter((m) => m.mailbox.id !== chosen.mailbox.id));
      await release(en.id, { next_run_at: new Date(Date.now() + 30 * 60_000).toISOString(), last_error: message });
      res.deferred++;
      return;
    }
    const attempts = en.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await release(en.id, { status: "hata", attempts, last_error: message });
      await addEvent({ uid, kind: "hata", sequenceId: seq.id, enrollmentId: en.id, contactId: en.contact_id, meta: { error: message } });
      res.failed++;
    } else {
      await release(en.id, { attempts, last_error: message, next_run_at: new Date(Date.now() + BACKOFF_MIN[attempts - 1] * 60_000).toISOString() });
      res.deferred++;
    }
    return;
  }

  // ── başarı: günlüğe yaz, sayaçları güncelle, sıradaki adımı planla
  const bare = messageId.replace(/^<|>$/g, "");
  const row = await db().from("outreach_messages").insert({ user_uid: uid, sequence_id: seq.id, step_id: step.id, enrollment_id: en.id, contact_id: en.contact_id, mailbox_id: chosen.mailbox.id, variant_key: variant.key, message_id: bare, in_reply_to: en.last_message_id, to_email: contact.email, subject, body_text: body }).select("id").single();
  const c = ctx.counts.get(chosen.mailbox.id) ?? { lastHour: 0, last24h: 0 };
  ctx.counts.set(chosen.mailbox.id, { lastHour: c.lastHour + 1, last24h: c.last24h + 1 });
  ctx.campaign24h.set(seq.id, (ctx.campaign24h.get(seq.id) ?? 0) + 1);
  await addEvent({ uid, kind: "gonderildi", sequenceId: seq.id, enrollmentId: en.id, messageRowId: row.data?.id ?? null, contactId: en.contact_id, meta: { step: en.current_step, variant: variant.key } });
  res.sent++;

  const patch = { mailbox_id: chosen.mailbox.id, last_message_id: bare, thread_root: en.thread_root ?? bare, root_subject: en.root_subject ?? subject };
  if ((await advance(en, seq, active, patch)) === "finished") res.finished++;
}

async function processEnrollment(en: EnrollmentRow, ctx: Ctx, res: TickResult) {
  let seq = ctx.sequences.get(en.sequence_id);
  if (seq === undefined) {
    seq = await getSequence(en.user_uid, en.sequence_id);
    ctx.sequences.set(en.sequence_id, seq);
  }
  if (!seq || seq.status !== "aktif") return void (await release(en.id), res.deferred++);

  const active = seq.steps.filter((s) => s.enabled);
  const step = active[en.current_step];
  if (!step) return void (await finish(en, "tamamlandi"), res.finished++);

  // Gönderim penceresi dışındaysa bir sonraki pencerenin başına ertelenir (küçük rastgele gecikmeyle)
  if (!isWithinWindow(new Date(), seq.schedule)) {
    const at = nextWindowStart(new Date(), seq.schedule);
    await release(en.id, { next_run_at: jitter(at ?? new Date(Date.now() + 86_400_000), 20).toISOString() });
    res.deferred++;
    return;
  }

  if (step.kind === "email") await runEmailStep(en, seq, active, step, ctx, res);
  else await runManualStep(en, seq, active, step, ctx, res);
}

/** Bir tick çalıştırır: en çok `batch` kaydı işler ve sonucu özetler. */
export async function runSendTick(opts: { batch?: number; deadlineMs?: number } = {}): Promise<TickResult> {
  const res: TickResult = { claimed: 0, sent: 0, tasks: 0, deferred: 0, finished: 0, failed: 0, bounced: 0 };
  const deadline = Date.now() + (opts.deadlineMs ?? 200_000);
  const claimed = await claimDue(opts.batch ?? 20);
  res.claimed = claimed.length;
  const ctx: Ctx = { sequences: new Map(), mailboxes: new Map(), counts: new Map(), campaign24h: new Map(), senders: new Map(), suppressions: new Map(), aiBudget: AI_BUDGET_PER_TICK };

  for (const en of claimed) {
    if (Date.now() > deadline) {
      await release(en.id); // süre doldu: kaydı bir sonraki tick'e bırak
      continue;
    }
    try {
      await processEnrollment(en, ctx, res);
    } catch (e) {
      // Beklenmeyen hata tek kaydı durdurmasın: kayıt serbest bırakılır, kısa süre sonra yeniden denenir.
      console.error("Gönderim hatası:", e);
      await release(en.id, { next_run_at: new Date(Date.now() + 10 * 60_000).toISOString(), last_error: e instanceof Error ? e.message.slice(0, 200) : "Beklenmeyen hata" }).catch(() => undefined);
      res.failed++;
    }
  }
  return res;
}
