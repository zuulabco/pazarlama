import { fold } from "@/lib/text";

/**
 * "E-postayı denetle": soğuk e-postanın spam'e düşme riskini artıran, kurala dayalı ve açıklanabilir sinyaller (saf).
 * Kesin bir spam filtresi değildir; yazarken uyarı vermek içindir.
 */

export type Issue = { level: "uyari" | "bilgi"; text: string };
export type SpamReport = { score: number; label: "İyi" | "Gelişebilir" | "Riskli"; issues: Issue[] };

const SPAM_PHRASES = [
  "ücretsiz", "bedava", "kazan", "kazanç", "garanti", "%100", "hemen tıkla", "tıkla", "son fırsat", "kaçırma", "acele", "sınırlı süre", "tek seferlik", "şimdi al",
  "risk yok", "indirim", "kampanya", "para kazan", "ek gelir", "kredi", "borç", "free", "winner", "act now", "limited time", "click here", "guaranteed", "100%", "no obligation",
];

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export function checkEmail(subject: string, body: string): SpamReport {
  const issues: Issue[] = [];
  let penalty = 0;
  const add = (level: Issue["level"], text: string, cost: number) => {
    issues.push({ level, text });
    penalty += cost;
  };

  const all = fold(`${subject}\n${body}`);
  const hits = SPAM_PHRASES.filter((p) => all.includes(fold(p)));
  if (hits.length > 0) add("uyari", `Spam filtrelerinin sevdiği ifadeler var: ${hits.slice(0, 5).join(", ")}.`, Math.min(30, hits.length * 10));

  if (!subject.trim()) add("uyari", "Konu satırı boş.", 25);
  else {
    if (subject.length > 70) add("uyari", "Konu 70 karakterden uzun; telefonlarda kesilir.", 8);
    if (/^(re|fw|fwd|yanıt|ynt):/i.test(subject.trim())) add("uyari", "Konu “Re:” ile başlıyor; sahte yanıt gibi görünüp güveni zedeler.", 20);
    const letters = subject.replace(/[^\p{L}]/gu, "");
    if (letters.length > 6 && letters === letters.toLocaleUpperCase("tr")) add("uyari", "Konu tamamen büyük harf.", 15);
    if ((subject.match(/[!?]/g) ?? []).length > 1) add("uyari", "Konuda birden fazla ünlem/soru işareti var.", 10);
  }

  const words = wordCount(body);
  if (words < 15) add("bilgi", "Mesaj çok kısa; ne istediğinizi bir cümleyle netleştirin.", 5);
  if (words > 180) add("uyari", `Mesaj ${words} kelime; soğuk e-postada 50-120 kelime en iyi sonucu verir.`, 12);

  const links = (body.match(/https?:\/\/\S+|www\.\S+/gi) ?? []).length;
  if (links > 2) add("uyari", `Mesajda ${links} bağlantı var; en çok 1-2 bağlantı kullanın.`, 15);
  if (/\b(bit\.ly|tinyurl|t\.co|goo\.gl|cutt\.ly)\b/i.test(body)) add("uyari", "Kısaltılmış bağlantı kullanılmış; spam filtreleri bunlara şüpheyle bakar.", 15);

  const caps = body.match(/\b[\p{Lu}]{5,}\b/gu) ?? [];
  if (caps.length > 1) add("uyari", "Mesajda birkaç tamamen büyük harfli kelime var.", 8);
  if ((body.match(/!/g) ?? []).length > 2) add("uyari", "Çok fazla ünlem işareti var.", 8);
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(`${subject}${body}`)) add("bilgi", "Emoji kullanılmış; iş e-postasında sade metin daha güvenilir görünür.", 4);

  if (!/\{\{\s*(first_name|name|company)/i.test(body) && !/merhaba|iyi günler|selam/i.test(body)) add("bilgi", "Selamlama yok; “Merhaba {{first_name|}}” ile başlamak sıcak bir giriş sağlar.", 4);
  if (!/\?/.test(body)) add("bilgi", "Mesajda bir soru yok; tek, net bir soru yanıt oranını artırır.", 5);

  const score = Math.max(0, 100 - penalty);
  return { score, label: score >= 80 ? "İyi" : score >= 55 ? "Gelişebilir" : "Riskli", issues };
}
