import "server-only";
import { chatJson } from "@/lib/llm/nvidia";
import { acceptProofread, parseDraft, type Draft, type WorkKind } from "./context";

/**
 * Taslağın Türkçe yazım, ek ve noktalama hatalarını ikinci, kısa bir geçişle düzeltir. Model yazım
 * hatası yapabildiği için taslak kullanıcıya gitmeden önce denetlenir. Başarısız olursa asıl taslak döner.
 */
export async function proofread(kind: WorkKind, draft: Draft): Promise<Draft> {
  try {
    const input = draft.subject ? { konu: draft.subject, metin: draft.body } : { metin: draft.body };
    const raw = await chatJson(
      [
        {
          role: "system",
          content: [
            "Sen bir Türkçe yazım denetçisisin. Verilen JSON'daki metinlerin yazım, ek ve ünlü uyumu, çekim ve noktalama hatalarını düzelt.",
            "Anlamı, cümleleri, cümle sırasını, selamlamayı, imzayı ve paragraf aralarını DEĞİŞTİRME; yeni bilgi, cümle ya da kelime ekleme; üslubu değiştirme. Hata yoksa metni aynen döndür.",
            "Çıktı, girdiyle aynı anahtarlara sahip yalnızca JSON olsun.",
          ].join("\n"),
        },
        { role: "user", content: JSON.stringify(input) },
      ],
      { maxTokens: 1500, timeoutMs: 12_000, thinking: false, temperature: 0 },
    );
    const fixed = parseDraft(kind, raw);
    return acceptProofread(draft, fixed) ? fixed : draft;
  } catch {
    return draft;
  }
}
