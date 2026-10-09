import { fold } from "@/lib/text";
import type { LeadStatus } from "./unibox-options";

/**
 * Yanıt metninden durum etiketi (saf, kural tabanlı). Olumsuz ifadeler önce bakılır: "toplantı istemiyoruz" ilgisizdir.
 * Emin olunamazsa null döner; çağıran yapay zekâya sorabilir ya da "lead" bırakabilir.
 */

const quoted = /^(>|on .+ wrote:|.+ tarihinde .+ yazdı:?)/i;

/** Alıntıları ve imzayı atıp yanıtın kendi metnini döndürür. */
export function ownText(body: string): string {
  const out: string[] = [];
  for (const l of body.split(/\r?\n/)) {
    if (quoted.test(l.trim()) || /^-{2,}\s*(original|forwarded)/i.test(l.trim())) break;
    out.push(l);
  }
  return out.join("\n").trim();
}

const NOT_INTERESTED = /ilgilenmiyor|ilgilenmiyoruz|istemiyor|rahatsiz etmey|listeden cikar|listenizden cikar|abonelikten cik|gerek(li)? yok|ihtiyac(imiz)? yok|not interested|no thanks|no thank you|unsubscribe|remove me|stop (emailing|contacting)|don.?t (email|contact)/;
const WRONG_PERSON = /yanlis kisi|bu konuda .*(sorumlu|yetkili) degil|dogru kisi (ben )?degil|ilgili kisi|wrong person|not the right person|no longer (work|with)|artik .*calismiyor|isten ayril|ayrildi/;
const MEETING = /toplanti|gorusme|gorusebiliriz|gorusmek isteriz|takvim|calendly|meeting|schedule a call|let.?s (talk|chat|connect)|musait/;
const INTERESTED = /ilgileniyoruz|ilgilendim|ilgimi cekti|detay|bilgi (alabilir|verebilir|gonder)|fiyat|teklif|interested|tell me more|send (me )?(more )?(info|details)|sounds good|evet/;

export function classifyReplyText(body: string): LeadStatus | null {
  const t = fold(ownText(body)).replace(/\s+/g, " ");
  if (t.length < 2) return null;
  if (NOT_INTERESTED.test(t)) return "ilgisiz";
  if (WRONG_PERSON.test(t)) return "yanlis_kisi";
  if (MEETING.test(t)) return "toplanti";
  if (INTERESTED.test(t)) return "ilgili";
  return null;
}

/** Listede gösterilecek kısa önizleme (alıntısız, tek satır). */
export function previewOf(body: string, max = 140): string {
  const t = ownText(body).replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

const OPT_OUT_WORD = /\b(iptal|cikar|cikarin|cikart|stop|unsubscribe|remove|durdur|durdurun)\b/;
const OPT_OUT_PHRASE =
  /abonelik(ten)? (cik|iptal)|aboneligimi iptal|aboneligi iptal|listeden cik|listenizden cik|listeden silin|beni listeden|bir daha (yazma|mail|e-?posta|ulas|gonder)|mail(ler)?(i)?(mi)? (gondermeyin|atmayin)|e-?posta(lar)?(i)?(mi)? gondermeyin|rahatsiz etmeyin|unsubscribe|remove me|stop (emailing|contacting|sending)|don.?t (email|contact) me/;

/**
 * Yanıt bir "listeden çıkar" talebi mi? E-postanın altındaki "İPTAL yazın" satırına karşılık gelen kısa yanıtlar ("İPTAL", "iptal edin", "çıkar", "stop")
 * ve açık ifadeler ("abonelikten çıkmak istiyorum", "bir daha yazmayın") true döner. Uzun bir metinde tek başına "iptal" geçmesi
 * (örn. "randevumu iptal etmek istiyorum") çıkış sayılmaz; yanlış kişiyi kara listeye almamak için kural bilerek dardır.
 */
export function isOptOutReply(body: string): boolean {
  const t = fold(ownText(body))
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return false;
  const words = t.split(" ").length;
  if (words <= 3 && OPT_OUT_WORD.test(t)) return true;
  return words <= 40 && OPT_OUT_PHRASE.test(t);
}
