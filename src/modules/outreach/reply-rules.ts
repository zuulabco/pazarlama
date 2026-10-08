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
