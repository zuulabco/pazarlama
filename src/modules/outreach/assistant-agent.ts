import "server-only";
import { chatJson } from "@/lib/llm/nvidia";
import { createPlan } from "@/modules/plan/repository";
import { parseMessages, parsePlanOutput } from "@/modules/plan/parse";
import { planInputSchema, kindLabel } from "@/modules/plan/types";
import { intentMessages, maybeAction, pageTargets, planInputFrom, toIntent, whenText, type Intent, type PageKey } from "./assistant-rules";
import type { AssistantAnswer } from "./assistant-types";

/**
 * Adspine AI'nın "ajan" tarafı: mesaj bir iş isteği mi? Öyleyse işi yapar (takvime plan ekler, müşteri aramasını başlatacak sayfaya yönlendirir,
 * sayfa açar) ve yapılanı bildiren yanıt döndürür. İş isteği değilse null döner; sıradan soru-yanıt akışı sürer.
 */

async function classify(text: string): Promise<Intent> {
  try {
    return toIntent(await chatJson(intentMessages(text), { maxTokens: 200, timeoutMs: 15_000, thinking: false, temperature: 0 }));
  } catch (e) {
    console.error("Niyet belirlenemedi:", e instanceof Error ? e.message : e);
    return { niyet: "soru" };
  }
}

export async function runAgent(uid: string, text: string): Promise<AssistantAnswer | null> {
  if (!maybeAction(text)) return null;
  const intent = await classify(text);

  if (intent.niyet === "takvim_ekle") {
    try {
      const parsed = parsePlanOutput(await chatJson(parseMessages(text, new Date()), { maxTokens: 600, timeoutMs: 25_000, thinking: false, temperature: 0 }));
      const input = planInputSchema.parse(planInputFrom(parsed));
      const item = await createPlan(uid, input);
      const when = whenText(item.startsAt, item.allDay);
      const note = item.allDay && !parsed.time ? " Saat belirtmediğiniz için tüm gün olarak ekledim." : "";
      return {
        reply: `Takviminize ekledim: "${item.title}" · ${when}${item.location ? ` · ${item.location}` : ""}.${note} Takvimi açıyorum; yanlışsa buradan geri alabilirsiniz.`,
        links: [],
        action: { type: "plan", id: item.id, title: item.title, kind: kindLabel(item.kind), startsAt: item.startsAt, allDay: item.allDay, when, withName: item.withName, location: item.location },
      };
    } catch (e) {
      console.error("Takvime eklenemedi:", e instanceof Error ? e.message : e);
      const full = e instanceof Error && e.message.startsWith("En fazla");
      return { reply: full ? e.message : "Bunu takvime ekleyemedim; tarihi ve saati ekleyerek tekrar yazabilir ya da Takvim sayfasından elle ekleyebilirsiniz (örn. \"yarın 12:00 dişçi randevusu\").", links: [{ path: "/panel/plan", label: "Takvim" }] };
    }
  }

  if (intent.niyet === "musteri_ara" && intent.sorgu) {
    return {
      reply: `Müşteri bul'a gidip "${intent.sorgu}" için aramayı başlatıyorum. Filtreleri orada görüp değiştirebilir, "Daha fazla listele" ile sayıyı artırabilirsiniz.`,
      links: [],
      action: { type: "go", path: `${pageTargets["kisi-bul"].path}?ara=${encodeURIComponent(intent.sorgu)}`, label: "Müşteri bul", detail: intent.sorgu },
    };
  }

  if (intent.niyet === "sayfa_ac" && intent.sayfa) {
    const t = pageTargets[intent.sayfa as PageKey];
    return { reply: `${t.label} sayfasını açıyorum.`, links: [], action: { type: "go", path: t.path, label: t.label } };
  }
  return null;
}
