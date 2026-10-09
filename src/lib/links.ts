/**
 * Metindeki "https://" olmadan yazılmış web adreslerini ("adspine.app", "www.firma.com.tr/teklif") tam bağlantıya çevirir (saf).
 * Posta ve mesajlaşma uygulamaları başında https olmayan adresleri çoğunlukla düz metin sayar; bu yüzden gönderirken eklenir.
 * E-posta adresleri, zaten http(s):// ile başlayanlar ve bilinmeyen uzantılar ("ör.ek", "örn.sonra") dokunulmadan kalır.
 */

const TLD = "com\\.tr|org\\.tr|net\\.tr|gen\\.tr|web\\.tr|av\\.tr|k12\\.tr|edu\\.tr|gov\\.tr|com|net|org|io|app|co|dev|ai|tr|info|biz|online|site|shop|store|tech|xyz|me|eu|ly|gg";

// Önünde harf/rakam/@/./:/-/ olmayan; etiketlerden oluşan bir ad + bilinen uzantı; ardından isteğe bağlı yol.
const BARE = new RegExp(`(?<![\\p{L}\\p{N}@./:_-])((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:${TLD}))(?![\\p{L}\\p{N}@-])((?:[/?#][^\\s<>"']*)?)`, "giu");

const TRAILING = /[.,;:!?)\]]+$/;

export function ensureHttps(text: string): string {
  return text.replace(BARE, (match, host: string, path: string) => {
    let tail = "";
    let rest = path;
    const m = TRAILING.exec(rest);
    if (m) {
      tail = m[0];
      rest = rest.slice(0, -tail.length);
    }
    // Yol yoksa, noktalama ana adrese yapışmamıştır (regex ana adı zaten sonda sınırlıyor).
    return `https://${host.toLowerCase()}${rest}${tail}`;
  });
}
