import { fold } from "@/lib/text";

/**
 * Soru kutusunun LLM'siz katmanı: Türkçe soruyu kurallarla çözümler.
 * Süzgeç, sıralama ve sayım soruları doğrudan veritabanı verisinden yanıtlanır; yalnızca
 * yorum/öneri soruları dil modeline gider.
 */

export type AskSort = "score" | "digital" | "reach" | "priority" | "rating" | "reviews";

export type AskFilters = {
  web?: "var" | "yok";
  tel?: "var" | "yok";
  minScore?: number;
  minDigital?: number;
  minRating?: number;
  minReviews?: number;
  /** Soruda geçen semt/ilçe (aramadaki firmalarda görülen değerlerden biri). */
  district?: string;
};

export type AskIntent = {
  kind: "list" | "stats" | "interpret";
  filters: AskFilters;
  sort: AskSort;
  limit: number;
  /** Sıralama sorudan mı çıktı, yoksa varsayılan mı. */
  sortGiven: boolean;
};

export const askLimits = { maxQuestion: 200, listDefault: 5, listMax: 20 } as const;

export const sortLabels: Record<AskSort, string> = {
  score: "genel skor",
  digital: "dijital ihtiyaç",
  reach: "ulaşılabilirlik",
  priority: "öncelik",
  rating: "Google puanı",
  reviews: "yorum sayısı",
};

const num = (s: string) => Number(s.replace(",", "."));

/** "4,5 puan üstü", "70 skor ve üzeri" gibi sayı + eşik kalıpları. */
const threshold = "(?:ustu|uzeri|ve ustu|ve uzeri|den fazla|dan fazla|den yuksek|dan yuksek|\\+)";

export function parseQuestion(question: string, knownDistricts: string[] = []): AskIntent {
  const q = fold(question).replace(/[?!.]+$/g, " ").replace(/\s+/g, " ").trim();
  const filters: AskFilters = {};

  // Web sitesi / telefon
  if (/(web ?)?sitesi\w*\s+(olmayan|yok|bulunmayan)|sitesiz|websiz|sitesi olmayan/.test(q)) filters.web = "yok";
  else if (/(web ?)?sitesi\w*\s+(olan|var|bulunan)/.test(q)) filters.web = "var";
  if (/telefon\w*\s+(olmayan|yok|bulunmayan)/.test(q)) filters.tel = "yok";
  else if (/telefon\w*\s+(olan|var|bulunan)/.test(q)) filters.tel = "var";

  // Yorum sayısı: "200 yorumdan fazla", "yorumu 100 ustu"
  const reviews = q.match(new RegExp(`(\\d{1,5})\\s*yorum\\w*\\s*${threshold}`)) ?? q.match(new RegExp(`yorum\\w*\\s*(\\d{1,5})\\s*${threshold}`));
  if (reviews) filters.minReviews = num(reviews[1]);

  // "4,5 puan ustu", "4.5 yildiz ve uzeri", "puani 4 ustu" (en çok 5 → Google puanı)
  const rating =
    q.match(new RegExp(`(\\d(?:[.,]\\d)?)\\s*(?:puan|yildiz)\\w*\\s*${threshold}`)) ??
    q.match(new RegExp(`(?:google )?(?:puan|yildiz)\\w*\\s*(\\d(?:[.,]\\d)?)\\s*${threshold}`));
  if (rating && num(rating[1]) <= 5) filters.minRating = num(rating[1]);

  // Dijital ihtiyaç ve genel skor eşikleri: "dijital ihtiyaci 70 ustu", "skoru 80 ustu"
  const digital = q.match(new RegExp(`dijital\\w*(?: ihtiyac\\w*)?\\s*(\\d{2,3})\\s*${threshold}`));
  if (digital) filters.minDigital = num(digital[1]);
  const score =
    q.match(new RegExp(`(?:genel )?(?:skor|puan)\\w*\\s*(\\d{2,3})\\s*${threshold}`)) ??
    q.match(new RegExp(`(\\d{2,3})\\s*(?:skor|puan)\\w*\\s*${threshold}`));
  if (score && !(rating && score[1] === rating[1])) filters.minScore = num(score[1]);

  // Semt / ilçe: aramadaki firmalarda görülen değerlerden biri soruda geçiyorsa
  for (const d of knownDistricts) {
    const f = fold(d);
    if (f.length >= 3 && new RegExp(`(^| )${f}`).test(q)) {
      filters.district = d;
      break;
    }
  }

  // Sıralama
  let sort: AskSort = "score";
  let sortGiven = true;
  if (/dijital\w*\s*(ihtiyac\w*\s*)?(en\s+)?(yuksek|fazla|buyuk)|en\s+(cok\s+)?dijital|dijital\w* ihtiyaci en/.test(q)) sort = "digital";
  else if (/ulasil\w*|ulasmasi kolay|kolay ulas/.test(q)) sort = "reach";
  else if (/en\s+cok\s+yorum|yorum\w*\s+en\s+(cok|fazla)|en\s+fazla\s+yorum/.test(q)) sort = "reviews";
  else if (/en\s+(yuksek|iyi)\s+(google\s+)?(puan|yildiz)|puani\s+en\s+(yuksek|iyi)/.test(q)) sort = "rating";
  else if (/oncelik|once\s+ara/.test(q)) sort = "priority";
  else if (/en\s+(yuksek|iyi|guclu|uygun)|skor\w*\s+en|ilk\s+\d+/.test(q)) sort = "score";
  else sortGiven = false;

  // Adet: "ilk 5", "en iyi 3", "10 firma"
  const countMatch = q.match(/(?:ilk|en\s+\w+(?:\s+\w+)?)\s+(\d{1,3})\b/) ?? q.match(/\b(\d{1,3})\s+(?:firma|musteri|aday|tane)/);
  const singular = /\ben\s+(iyi|yuksek|guclu|uygun)\s+(\w+\s+)?(firma|musteri|aday)\b(?!\w)/.test(q) && !/firmalar|musteriler|adaylar/.test(q);
  let limit: number = askLimits.listDefault;
  if (countMatch) limit = Math.min(Math.max(num(countMatch[1]), 1), askLimits.listMax);
  else if (singular) limit = 1;

  const hasFilters = Object.keys(filters).length > 0;

  // Yorum / öneri soruları: dil modeline gider
  const wantsInterpretation =
    /\b(neden|nicin|niye|nasil|ne soyle|ne yaz|mesaj|yaklas|oner|tavsiye|hangisi|hangisini|yorumla|anlat|acikla|strateji|kime|firsat|ilk temas|teklif|konus|ikna|sunum)/.test(q);
  const wantsStats = /\b(kac|kactir|kac tane|ortalama|toplam|sayisi|dagilim|yuzde)\b/.test(q);
  const wantsList =
    hasFilters || sortGiven || /\b(goster|listele|sirala|hangi firmalar|firmalari|bul|getir|var mi)\b/.test(q);

  let kind: AskIntent["kind"];
  if (wantsInterpretation) kind = "interpret";
  else if (wantsStats) kind = "stats";
  else if (wantsList) kind = "list";
  else kind = "interpret";

  return { kind, filters, sort, limit, sortGiven };
}

/** Uygulanan süzgeçlerin okunabilir özeti (yanıt kartında etiket olarak gösterilir). */
export function describeFilters(f: AskFilters): string[] {
  const out: string[] = [];
  if (f.web) out.push(`Web sitesi ${f.web}`);
  if (f.tel) out.push(`Telefon ${f.tel}`);
  if (f.minScore !== undefined) out.push(`Genel skor ${f.minScore}+`);
  if (f.minDigital !== undefined) out.push(`Dijital ihtiyaç ${f.minDigital}+`);
  if (f.minRating !== undefined) out.push(`Google puanı ${String(f.minRating).replace(".", ",")}+`);
  if (f.minReviews !== undefined) out.push(`${f.minReviews}+ yorum`);
  if (f.district) out.push(f.district);
  return out;
}
