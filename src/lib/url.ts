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
