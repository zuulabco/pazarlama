/** Dışarıdan gelen bir adresi yalnızca http(s) ise döndürür ("javascript:" gibi şemaları engeller). */
export function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Telefon numarasından "tel:" bağlantısı için yalnızca rakam ve + bırakır. */
export function telHref(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/[^\d+]/g, "");
  return digits && digits.length >= 7 ? `tel:${digits}` : null;
}

/**
 * Kullanıcının yazdığı site adresini ("firma.com", "www.firma.com/hizmetler") tam bir http(s) adresine çevirir.
 * Geçerli bir alan adı değilse (boşluk, tek kelime, IP, localhost, kimlik bilgisi…) null döner.
 * Asıl güvenlik denetimi sunucuda yapılır; bu, kullanıcıyı yazarken uyarmak içindir.
 */
export function normalizeSiteUrl(text: string): string | null {
  const raw = text.trim();
  if (!raw || /\s/.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (!/^(?!-)[a-z\d-]+(\.[a-z\d-]+)*\.[a-z]{2,}$/i.test(url.hostname)) return null;
  url.hash = "";
  return url.toString();
}
