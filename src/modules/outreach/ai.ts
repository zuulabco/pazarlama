import "server-only";
import { chatJson } from "@/lib/llm/nvidia";
import { normalizeSiteUrl } from "@/lib/url";
import { extractPage } from "@/modules/profile/site/extract";
import { fetchPublicHtml } from "@/modules/profile/site/safe-fetch";
import { openerMessages, openerSchema, sequenceMessages, sequenceSchema, stepFromTemplate, cleanSubject, stripClosing, templateMessages, templateSchema, type SenderContext } from "./ai-prompts";
import type { AiSettings, EmailType, Step } from "./sequence-schema";

/** Model çağrıları: şablon yazma, otomasyon üretme, kişisel açılış cümlesi. Hepsi doğrulanır; geçersiz çıktı hata verir. */

export async function writeTemplate(input: { settings: AiSettings; mode: "asistan" | "istem"; prompt?: string; service?: string | null; previousSubject?: string; sender: SenderContext }) {
  const raw = await chatJson(templateMessages(input), { maxTokens: 1500, timeoutMs: 40_000, thinking: false, temperature: 0.4 });
  const t = templateSchema.parse(raw);
  return { subject: cleanSubject(t.konu), body: stripClosing(t.metin) };
}

export async function writeSequence(input: { goal: string; audience: string; steps: number; tone: AiSettings["tone"]; sender: SenderContext }): Promise<Omit<Step, "id" | "position">[]> {
  const raw = await chatJson(sequenceMessages(input), { maxTokens: 3500, timeoutMs: 55_000, thinking: false, temperature: 0.4 });
  const parsed = sequenceSchema.parse(raw);
  return parsed.adimlar.map((a, i) => stepFromTemplate({ konu: i === 0 && !cleanSubject(a.konu) ? "Kısa bir soru" : cleanSubject(a.konu), metin: stripClosing(a.metin) }, (i === 0 ? "tanisma" : i === parsed.adimlar.length - 1 && i > 1 ? "son" : a.tip) as EmailType, i === 0 ? 0 : a.bekleme_gun * 1440));
}

/** Firmanın sitesinden okunan gerçeklere dayanan tek cümlelik açılış; site yoksa/okunamazsa ya da anlamlı bir şey yoksa null. */
export async function writeOpener(input: { company: string | null; city: string | null; website: string | null; sender: SenderContext }): Promise<string | null> {
  const url = input.website ? normalizeSiteUrl(input.website) : null;
  if (!url) return null;
  let facts: string;
  try {
    const page = extractPage((await fetchPublicHtml(url)).html);
    facts = [page.title && `Başlık: ${page.title}`, page.description && `Açıklama: ${page.description}`, page.headings.length > 0 && `Başlıklar: ${page.headings.slice(0, 8).join(" | ")}`, page.text && `Metin: ${page.text.slice(0, 1200)}`]
      .filter(Boolean)
      .join("\n");
  } catch {
    return null;
  }
  if (facts.length < 60) return null;
  const raw = await chatJson(openerMessages({ company: input.company, city: input.city, siteFacts: facts, sender: input.sender }), { maxTokens: 300, timeoutMs: 20_000, thinking: false, temperature: 0.2 });
  const opener = openerSchema.parse(raw).acilis.replace(/\s+/g, " ").trim();
  // Güvenlik ağı: tek cümle, makul uzunluk, bağlantı/ünlem yok
  if (opener.length < 15 || /https?:|www\.|!/.test(opener) || (opener.match(/[.?]/g) ?? []).length > 2) return null;
  return opener;
}
