import "server-only";
import { db } from "@/lib/supabase/server";
import { listPlan } from "@/modules/plan/repository";
import { kindLabel } from "@/modules/plan/types";
import { listLists, listSuppressions } from "./contacts";
import { contactsSection, isSmallTalk, planSection, routeTopics, searchTerms, wantsAdvice, type ChatTurn, type ContactRow, type Topic } from "./assistant-rules";
import { loadHome } from "./home";
import { attention, focusOf, setupSteps } from "./home-rules";
import { statusLabel } from "./unibox-options";

/**
 * Yardımcının hesap verileri: sorunun konusuna göre kullanıcının kayıtlı kişilerini, takvimini, yanıtlarını ve kara listesini getirir.
 * Yalnızca soran kullanıcıya ait veriler okunur; model bunları "Kullanıcının verileri" olarak görür.
 */

const DAY = 86_400_000;

async function contacts(uid: string, question: string): Promise<string> {
  const [total, valid, lists, rows] = await Promise.all([
    db().from("outreach_contacts").select("id", { count: "exact", head: true }).eq("user_uid", uid),
    db().from("outreach_contacts").select("id", { count: "exact", head: true }).eq("user_uid", uid).not("email", "is", null).neq("email_status", "gecersiz"),
    listLists(uid).catch(() => []),
    db().from("outreach_contacts").select("name, company, job_title, city, website, email, email_status").eq("user_uid", uid).order("created_at", { ascending: false }).limit(1500).returns<ContactRow[]>(),
  ]);
  const { terms, expanded } = searchTerms(question);
  return contactsSection({ total: total.count ?? 0, withEmail: valid.count ?? 0, lists, rows: rows.data ?? [], terms, expanded });
}

async function plan(uid: string): Promise<string> {
  const now = Date.now();
  const items = await listPlan(uid, new Date(now - 14 * DAY), new Date(now + 60 * DAY));
  return planSection(items.map((i) => ({ startsAt: i.startsAt, kind: kindLabel(i.kind), title: i.title, withName: i.withName, location: i.location, allDay: i.allDay, done: i.done })));
}

async function replies(uid: string): Promise<string> {
  const { data } = await db()
    .from("outreach_enrollments")
    .select("lead_status, last_reply_at, read_at, root_subject, outreach_contacts(name, company, email)")
    .eq("user_uid", uid)
    .not("last_reply_at", "is", null)
    .order("last_reply_at", { ascending: false })
    .limit(10)
    .returns<{ lead_status: Parameters<typeof statusLabel>[0]; last_reply_at: string; read_at: string | null; root_subject: string | null; outreach_contacts: { name: string | null; company: string | null; email: string } | null }[]>();
  if (!data?.length) return "Gelen kutusunda henüz otomasyon yanıtı yok.";
  const unread = data.filter((e) => !e.read_at || Date.parse(e.read_at) < Date.parse(e.last_reply_at)).length;
  return [`Son ${data.length} yanıt (${unread} okunmamış):`, ...data.map((e) => `- ${e.outreach_contacts?.name ?? e.outreach_contacts?.email ?? "?"}${e.outreach_contacts?.company ? ` (${e.outreach_contacts.company})` : ""}: ${statusLabel(e.lead_status)} · ${e.root_subject ?? "konu yok"} · ${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" }).format(new Date(e.last_reply_at))}`)].join("\n");
}

async function mailboxes(uid: string): Promise<string> {
  const { data } = await db()
    .from("outreach_mailboxes")
    .select("email, status, last_error, daily_limit, warmup_enabled, warmup_score")
    .eq("user_uid", uid)
    .returns<{ email: string; status: string; last_error: string | null; daily_limit: number; warmup_enabled: boolean; warmup_score: number | null }[]>();
  if (!data?.length) return "Bağlı gönderici adresi yok.";
  return ["Gönderici adresleri:", ...data.map((m) => `- ${m.email}: ${m.status}${m.last_error ? ` (hata: ${m.last_error.slice(0, 120)})` : ""}, günlük limit ${m.daily_limit}, ısındırma ${m.warmup_enabled ? `açık${m.warmup_score !== null ? `, skor %${m.warmup_score}` : ""}` : "kapalı"}`)].join("\n");
}

async function suppressions(uid: string): Promise<string> {
  const list = await listSuppressions(uid);
  if (!list.length) return "Kara listede kimse yok.";
  return [`Kara liste: ${list.length} kayıt.`, ...list.slice(0, 10).map((s) => `- ${s.email ?? s.domain}: ${s.reason}`)].join("\n");
}

/** "Ne yapmalıyım" soruları için: hesabın gerçek durumundan sıradaki adım, bekleyen uyarılar ve kurulum ilerlemesi. */
async function advice(uid: string): Promise<string> {
  const home = await loadHome(uid);
  const f = focusOf(home.facts);
  const steps = setupSteps(home.facts);
  const out = [`Önerilen sıradaki adım: ${f.title} — ${f.text}`];
  const alerts = attention(home.facts);
  if (alerts.length) out.push("Dikkat edilecekler:", ...alerts.map((a) => `- ${a.text}`));
  const todo = steps.filter((s) => !s.done);
  out.push(todo.length ? `Kurulumda eksik adımlar: ${todo.map((s) => s.title).join("; ")}.` : "Kurulum adımlarının hepsi tamam.");
  out.push(`Özet: ${home.facts.contacts} kayıtlı kişi, ${home.facts.campaigns} otomasyon (${home.activeCampaigns} aktif), bağlı gönderici adresi ${home.facts.connectedMailboxes}, ısındırması açık adres ${home.facts.warmupOn}, okunmamış yanıt ${home.facts.unread}, son 30 günde ${home.facts.sent} e-posta gönderildi.`);
  return out.join("\n");
}

/** Soruya uygun veri bölümlerini tek metinde birleştirir. Konu bulunamazsa kişi ve takvimin kısa özeti verilir. */
export async function knowledgeFor(uid: string, history: ChatTurn[]): Promise<string> {
  const question = history.at(-1)?.content ?? "";
  const previous = [...history].reverse().find((t, i) => i > 0 && t.role === "user")?.content ?? "";
  // Selamlaşma ve "kimsin / ne yapabilirsin" gibi mesajlara hesap verisi eklenmez (rakam dökmesin).
  if (isSmallTalk(question)) return "";
  const topics: Set<Topic> = routeTopics(question, previous);
  const jobs: Promise<string>[] = [];
  if (wantsAdvice(question)) jobs.push(advice(uid));
  if (topics.size === 0 && !wantsAdvice(question)) {
    // Konu belli değilse yalnızca kısa bir özet (ayrıntılı liste dökülmez).
    topics.add("kisiler");
    topics.add("plan");
  }
  if (topics.has("kisiler")) jobs.push(contacts(uid, question));
  if (topics.has("plan")) jobs.push(plan(uid));
  if (topics.has("gelen")) jobs.push(replies(uid));
  if (topics.has("adresler")) jobs.push(mailboxes(uid));
  if (topics.has("kara")) jobs.push(suppressions(uid));
  const parts = await Promise.allSettled(jobs);
  return parts.flatMap((p) => (p.status === "fulfilled" ? [p.value] : [])).join("\n\n");
}
