/**
 * Isındırma e-postası metin bankası (saf). Kısa, doğal, satış içermeyen iş yazışmaları: konu ve gövde ayrı ayrı rastgele
 * seçilir, ad ve gün eklenir; böylece iki ileti birbirinin aynısı olmaz. Çalışma anında yapay zekâ çağrısı yoktur.
 */

const subjects = [
  "Cuma toplantısı hakkında",
  "Küçük bir hatırlatma",
  "Dosyaları gördünüz mü?",
  "Haftalık plan",
  "Hızlı bir soru",
  "Teklif dosyası",
  "Randevu için uygun gün",
  "Notlarım",
  "Geçen görüşmemiz",
  "Rapor güncellemesi",
  "Önümüzdeki hafta",
  "Kısa bir bilgi",
  "Toplantı saati",
  "Evrakların durumu",
  "Takvim önerisi",
];

const openers = ["Merhaba", "Selam", "İyi günler", "Merhabalar"];

const bodies = [
  "geçen hafta konuştuğumuz konuyu toparlıyordum. Sizin için uygun olan bir saatte kısaca konuşabilir miyiz?",
  "elimdeki notları derledim, en kısa sürede paylaşırım. Eksik gördüğünüz bir şey olursa haber verin.",
  "yarınki planı netleştirmek istiyorum. Sabah mı öğleden sonra mı daha uygun olur?",
  "dosyayı gönderdim ama ulaşıp ulaşmadığından emin değilim. Bir bakabilir misiniz?",
  "rapor son haline geldi. Pazartesi günü birlikte göz atalım mı?",
  "toplantıyı bir sonraki haftaya almamız gerekebilir. Sizin takviminizde hangi günler boş?",
  "bahsettiğiniz noktayı not aldım, üzerinde çalışıyorum. Gelişme olursa size yazarım.",
  "kısa bir güncelleme: işler planlandığı gibi ilerliyor, bir aksilik yok.",
  "öğleden sonra müsaitseniz on dakikalık bir görüşme yapabiliriz. Size uyan bir saat var mı?",
  "evrakları kontrol ettim, küçük bir eksik var. Yarın birlikte tamamlayabiliriz.",
  "önerdiğiniz tarih bana uyuyor. Onaylarsanız takvime ekleyeceğim.",
  "iletinizi aldım, teşekkür ederim. Akşama kadar detaylı dönüş yapacağım.",
];

const closers = ["Teşekkürler", "İyi çalışmalar", "Kolay gelsin", "Saygılarımla", "Sevgiler"];

const replyBodies = [
  "teşekkürler, aldım. Birkaç gün içinde dönüş yapacağım.",
  "iletinizi gördüm, uygun bir saatte konuşalım.",
  "tamamdır, not aldım. Haftaya netleştirelim.",
  "güzel olur, yarın öğleden sonra müsaitim.",
  "dosyalar elime ulaştı, teşekkür ederim.",
  "haber verdiğiniz için teşekkürler, gerekirse arayabilirsiniz.",
];

type Rng = () => number;
const pick = <T>(list: readonly T[], rng: Rng): T => list[Math.floor(rng() * list.length) % list.length];

const first = (name: string | null) => name?.trim().split(/\s+/)[0] || null;

/** Yeni bir ısındırma e-postası (konu + düz metin gövde). */
export function warmupMessage(toName: string | null, fromName: string | null, rng: Rng = Math.random): { subject: string; text: string } {
  const to = first(toName);
  const hello = pick(openers, rng);
  const sign = first(fromName);
  return {
    subject: pick(subjects, rng),
    text: `${hello}${to ? ` ${to}` : ""},\n\n${pick(bodies, rng).replace(/^./, (c) => c.toLocaleUpperCase("tr"))}\n\n${pick(closers, rng)}${sign ? `,\n${sign}` : ""}\n`,
  };
}

/** Alınan ısındırma e-postasına verilecek kısa yanıt. */
export function warmupReply(toName: string | null, fromName: string | null, rng: Rng = Math.random): string {
  const to = first(toName);
  const sign = first(fromName);
  return `${pick(openers, rng)}${to ? ` ${to}` : ""},\n\n${pick(replyBodies, rng).replace(/^./, (c) => c.toLocaleUpperCase("tr"))}\n\n${pick(closers, rng)}${sign ? `,\n${sign}` : ""}\n`;
}

/** Başlıkta taşınan jeton: tahmin edilemez, yalnızca harf-rakam. */
export const newWarmupToken = () => crypto.randomUUID().replace(/-/g, "");
