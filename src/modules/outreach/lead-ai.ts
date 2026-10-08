import "server-only";
import { z } from "zod";
import { chatJson } from "@/lib/llm/nvidia";
import { countryOptions, emptySearch, industryOptions, roleOptions, sizeOptions, type LeadSearchInput } from "./lead-options";

/**
 * "Yapay zekâ ile ara": doğal dildeki isteği (örn. "İstanbul'daki 10-50 çalışanlı ajansların kurucuları") filtrelere çevirir.
 * Model yalnızca bizim sabit seçeneklerimizi döndürebilir; geçersiz değerler atılır, hiçbir şey uydurulmaz.
 */

const aiSchema = z.object({
  kisi_turleri: z.array(z.string()).default([]),
  unvanlar: z.array(z.string()).default([]),
  ulke: z.string().nullish(),
  sehir: z.string().nullish(),
  sektorler: z.array(z.string()).default([]),
  calisan_araliklari: z.array(z.string()).default([]),
  anahtar_kelimeler: z.array(z.string()).default([]),
});

const list = (items: readonly { value: string; label: string }[]) => items.map((o) => `- ${o.value} (${o.label})`).join("\n");

export function leadFilterMessages(text: string) {
  return [
    {
      role: "system" as const,
      content: `Bir B2B potansiyel müşteri arama aracının filtrelerini kuruyorsun. Kullanıcının isteğini yalnızca aşağıdaki seçeneklerle JSON'a çevir.
Sadece JSON döndür (başka metin yok). Emin olmadığın alanı boş bırak; hiçbir şey uydurma.

Şema:
{"kisi_turleri": [..], "unvanlar": [..], "ulke": "..." | null, "sehir": "..." | null, "sektorler": [..], "calisan_araliklari": [..], "anahtar_kelimeler": [..]}

kisi_turleri (yalnızca bu kodlar):
${list(roleOptions)}

ulke (yalnızca bu kodlardan biri; belirtilmemişse null):
${list(countryOptions)}

sektorler (yalnızca bu kodlar, en çok 4):
${list(industryOptions)}

calisan_araliklari (yalnızca bu kodlar):
${sizeOptions.map((o) => `- ${o.value}`).join("\n")}

Kurallar:
- "kurucu", "sahip" → kisi_turleri: sahip. "CEO", "genel müdür" → ust. "pazarlama yöneticisi/müdürü" → pazarlama. Benzer şekilde satis, satinalma, ik, finans, bt, operasyon.
- Listede karşılığı olmayan bir unvan istendiyse unvanlar alanına yaz (örn. "Mağaza Müdürü"); en çok 4.
- Şehir adını kullanıcının yazdığı gibi yaz (örn. "İstanbul"). Şehir varsa ulke'yi de doldur.
- "küçük işletme" → 1-10, 11-20, 21-50; "orta ölçekli" → 51-100, 101-200, 201-500. Sayı verilmişse en yakın aralıkları seç.
- Sektör listede yoksa sektorler boş kalsın, konuyu anahtar_kelimeler'e İngilizce tek kelime olarak yaz (örn. "e-commerce"); en çok 3.`,
    },
    { role: "user" as const, content: text.slice(0, 400) },
  ];
}

/** Model çıktısını bizim filtre türümüze çevirir; seçenek dışı değerleri atar. */
export function toFilters(raw: z.infer<typeof aiSchema>): Pick<LeadSearchInput, "roles" | "titles" | "country" | "city" | "industries" | "sizes" | "keywords"> {
  const pick = <T extends readonly { value: string }[]>(values: string[], options: T, max: number) => [...new Set(values.map((v) => v.trim()).filter((v) => options.some((o) => o.value === v)))].slice(0, max);
  const country = raw.ulke && countryOptions.some((c) => c.value === raw.ulke) ? raw.ulke : emptySearch().country;
  return {
    roles: pick(raw.kisi_turleri, roleOptions, 9),
    titles: [...new Set(raw.unvanlar.map((t) => t.trim()).filter((t) => t.length >= 2 && t.length <= 60))].slice(0, 4),
    country,
    city: raw.sehir?.trim().slice(0, 60) || undefined,
    industries: pick(raw.sektorler, industryOptions, 4),
    sizes: pick(raw.calisan_araliklari, sizeOptions, 5),
    keywords: [...new Set(raw.anahtar_kelimeler.map((k) => k.trim().toLowerCase()).filter((k) => k.length >= 2 && k.length <= 40))].slice(0, 3),
  };
}

export async function aiLeadFilters(text: string) {
  const raw = await chatJson(leadFilterMessages(text), { maxTokens: 700, timeoutMs: 30_000, thinking: false, temperature: 0.1 });
  return toFilters(aiSchema.parse(raw));
}
