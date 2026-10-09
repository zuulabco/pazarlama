import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/auth/origin";
import { getSessionUser } from "@/lib/auth/session";
import { chatJson, LlmUnavailableError } from "@/lib/llm/nvidia";
import {
  applyToneGreeting,
  buildMessages,
  goalValues,
  lengthValues,
  parseDraft,
  refineProblem,
  shortenFallback,
  refinements,
  refinementValues,
  refineMessages,
  toneValues,
  type WorkFirm,
} from "@/modules/work/context";
import { loadSender } from "@/modules/work/load";
import { proofread } from "@/modules/work/proofread";

export const maxDuration = 60;

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

const text = (max: number) => z.string().trim().max(max).nullish();

const bodySchema = z.object({
  kind: z.enum(["message", "email"]),
  goal: z.enum(goalValues),
  tone: z.enum(toneValues),
  length: z.enum(lengthValues).default("standart"),
  service: text(80),
  /** Mesajda olmasını istedikleri. */
  extra: text(300),
  /** Alıcı hakkında kullanıcının verdiği bilgiler (kayıtlı kişiden doldurulabilir). */
  recipient: z.object({ name: text(80), category: text(80), about: text(500) }).nullish(),
  /** Hazır taslağı yeniden yazdırma. */
  refine: z
    .object({
      action: z.enum(refinementValues).nullish(),
      custom: text(200),
      draft: z.object({ subject: z.string().max(200).nullish(), body: z.string().min(1).max(4000) }),
    })
    .nullish(),
});

/** Kullanıcı başına dakikada en çok 10 istek (sunucu örneği başına ilk savunma; bkz. api/leads/ask). */
const recent = new Map<string, number[]>();
function tooFast(uid: string) {
  const now = Date.now();
  const hits = (recent.get(uid) ?? []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(uid, hits);
  if (recent.size > 500) for (const [k, v] of recent) if (v.every((t) => now - t >= 60_000)) recent.delete(k);
  return hits.length > 10;
}

/** Kullanıcının anlattığı alıcı için bağlam. Gözlem üretilmez; yalnızca verilenler kullanılır. */
function genericFirm(r: z.infer<typeof bodySchema>["recipient"]): WorkFirm {
  return {
    known: false,
    id: "",
    name: r?.name?.trim() ?? "",
    category: r?.category?.trim() || null,
    district: null,
    phone: null,
    email: null,
    hasWebsite: false,
    closed: false,
    rating: null,
    reviews: null,
    score: 0,
    digital: 0,
    reach: 0,
    status: "",
    signals: [],
    notes: r?.about?.trim() ? [r.about.trim()] : [],
  };
}

/** İletişim mesajı ya da e-posta taslağı üretir (takipteki firmaya özel ya da genel); hazır taslağı yeniden yazar. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return error("Geçersiz istek kaynağı.", 403);
  const user = await getSessionUser();
  if (!user) return error("Oturumunuz sona erdi. Tekrar giriş yapın.", 401);
  if (tooFast(user.uid)) return error("Çok hızlı istek gönderiyorsunuz. Birkaç saniye bekleyip tekrar deneyin.", 429);

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return error("Geçersiz istek.", 400);
  const { kind, goal, tone, length, service, extra, recipient, refine } = body.data;

  const sender = await loadSender(user.uid, user.name);
  if (!sender) return error("Önce hesap kurulumunu tamamlayın.", 409);

  let messages;
  if (refine) {
    const preset = refine.action ? refinements.find((r) => r.value === refine.action)?.text : null;
    const instruction = [preset, refine.custom?.trim()].filter(Boolean).join("; ");
    if (!instruction) return error("Bir düzeltme seçin ya da isteğinizi yazın.", 400);
    messages = refineMessages({ kind, draft: { subject: refine.draft.subject ?? null, body: refine.draft.body }, instruction, sender });
  } else {
    messages = buildMessages({ kind, goal, tone, length, service: service || null, extra: extra || null, firm: genericFirm(recipient), sender });
  }

  try {
    const ask = (temperature: number, extra: { role: "assistant" | "user"; content: string }[] = []) =>
      chatJson([...messages, ...extra], { maxTokens: 1800, timeoutMs: 40_000, thinking: false, temperature });
    let raw = await ask(refine ? 0.3 : 0.15);
    let draft = parseDraft(kind, raw);
    if (refine) {
      // Model bazen isteği yok sayıp metni aynen (ya da yeterince kısaltmadan) döndürür: sorun belirtilerek en çok iki kez daha denenir.
      let problem = refineProblem(refine.action, refine.draft.body, draft.body);
      for (let attempt = 0; problem && attempt < 2; attempt++) {
        raw = await ask(0.6 + attempt * 0.2, [
          { role: "assistant", content: JSON.stringify(raw) },
          { role: "user", content: `Bu yanıt isteği uygulamadı: ${problem}. İsteği açıkça uygulayarak taslağı yeniden yaz; aynı JSON biçimini kullan.` },
        ]);
        draft = parseDraft(kind, raw);
        problem = refineProblem(refine.action, refine.draft.body, draft.body);
      }
      if (problem && refine.action === "kisalt") {
        const short = shortenFallback(refine.draft.body);
        if (short) {
          draft = { ...draft, body: short };
          problem = null;
        }
      }
      if (problem) return error("Bu düzeltmeyi uygulayamadım. İsteği başka sözcüklerle yazıp tekrar deneyin.", 422);
      draft = { ...draft, body: applyToneGreeting(draft.body, refine.action) };
    }
    return NextResponse.json(await proofread(kind, draft));
  } catch (e) {
    if (e instanceof LlmUnavailableError || e instanceof z.ZodError || e instanceof SyntaxError) {
      console.error("Taslak üretilemedi:", e instanceof Error ? e.message : e);
      return error("Taslak şu an hazırlanamadı. Biraz sonra tekrar deneyin.", 503);
    }
    console.error("Taslak üretilemedi:", e);
    return error("Taslak hazırlanamadı. Tekrar deneyin.", 500);
  }
}
