/**
 * Arama ve karşılaştırma için Türkçe duyarsız metin: "İstanbul", "istanbul", "ISTANBUL" ve
 * "Istanbul" aynı sonucu verir; ş/ğ/ü/ö/ç/â gibi harfler sade karşılıklarına çevrilir.
 */
export function fold(text: string): string {
  return text
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** İlk harfi büyütür (Türkçe kurallarıyla): "reklam" → "Reklam", "ışık" → "Işık". */
export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("tr") + text.slice(1);
}

/** Her kelimenin ilk harfini büyütür: "kadıköy istanbul" → "Kadıköy İstanbul". */
export function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr") + w.slice(1).toLocaleLowerCase("tr"))
    .join(" ");
}
