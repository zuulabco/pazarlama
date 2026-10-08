import "server-only";

/**
 * NVIDIA NIM (OpenAI uyumlu) sohbet istemcisi. Anahtar yalnızca sunucuda okunur.
 * Model sırası: bu hesapta yapılan denemelerde yanıt veren en güçlü model önce, yedek sonra.
 * (Listede görünen birçok model hesapta etkin değil; her ikisi de 2026-10-07'de doğrulandı.)
 */
const endpoint = "https://integrate.api.nvidia.com/v1/chat/completions";
const models = ["nvidia/nemotron-3-super-120b-a12b", "meta/muse-glimmer-30b"] as const;

export class LlmUnavailableError extends Error {}

type Message = { role: "system" | "user" | "assistant"; content: string };

/** Modelin metninden ilk JSON nesnesini çıkarır (``` işaretlerini ve önsözü yok sayar). */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Yanıtta JSON yok");
  return JSON.parse(text.slice(start, end + 1));
}

async function callModel(model: string, messages: Message[], maxTokens: number, signal: AbortSignal, thinking: boolean, temperature: number) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      // Nemotron varsayılan olarak uzun "düşünür"; yazım işlerinde kapatmak aynı kalitede ~10 kat hızlıdır.
      ...(!thinking && model.startsWith("nvidia/nemotron") ? { chat_template_kwargs: { enable_thinking: false } } : {}),
    }),
    signal,
  });
  if (!res.ok) throw new LlmUnavailableError(`${model}: HTTP ${res.status}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new LlmUnavailableError(`${model}: boş yanıt`);
  return content;
}

/** JSON döndürmesi istenen bir sohbet isteği. Model yanıt vermezse yedeğe geçer. */
export async function chatJson(messages: Message[], opts: { maxTokens?: number; timeoutMs?: number; thinking?: boolean; temperature?: number } = {}) {
  if (!process.env.NVIDIA_API_KEY) throw new LlmUnavailableError("NVIDIA_API_KEY tanımlı değil");
  const total = opts.timeoutMs ?? 50_000;
  const budgets = [Math.round(total * 0.65), Math.round(total * 0.35)];
  let last: unknown;
  for (const [i, model] of models.entries()) {
    try {
      // Her model kendi süre payıyla denenir; birincil yavaşsa yedeğe de zaman kalır.
      return extractJson(await callModel(model, messages, opts.maxTokens ?? 2500, AbortSignal.timeout(budgets[i] ?? budgets[1]), opts.thinking ?? true, opts.temperature ?? 0.2));
    } catch (e) {
      last = e;
    }
  }
  throw new LlmUnavailableError(last instanceof Error ? last.message : "Model yanıt vermedi");
}
