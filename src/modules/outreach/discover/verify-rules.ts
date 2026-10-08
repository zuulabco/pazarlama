/** Ücretsiz doğrulama kuralları (saf). DNS sorgusu `verify.ts`'tedir. */

export type MailDns = "mx" | "a" | "none" | "unknown";
export type EmailStatus = "yok" | "bulundu" | "elle" | "riskli" | "gecersiz";

/** Bilinen tek kullanımlık e-posta servisleri (kısa liste; kötüye kullanılanlar). */
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "10minutemail.com", "tempmail.com", "temp-mail.org", "yopmail.com", "trashmail.com",
  "getnada.com", "sharklasers.com", "dispostable.com", "throwawaymail.com", "maildrop.cc", "fakeinbox.com", "mohmal.com", "burnermail.io",
  "tempmailo.com", "mailnesia.com", "mintemail.com", "spamgourmet.com", "moakt.com", "emailondeck.com", "tmpmail.org", "mytemp.email",
]);

export const isDisposable = (domain: string) => DISPOSABLE.has(domain.toLowerCase());

/**
 * Bulunan ya da girilen adresin durumunu belirler. Gerçek gönderici adresi doğrulaması (SMTP RCPT) yapılamadığı için
 * en iyi ihtimalle "alan adı posta alabiliyor" denir; asıl kalite bounce'tan öğrenmeyle sağlanır.
 */
export function statusFor(input: { dns: MailDns; disposable: boolean; origin: "site" | "elle" }): EmailStatus {
  if (input.disposable || input.dns === "none") return "gecersiz";
  if (input.dns === "unknown") return "riskli";
  return input.origin === "site" ? "bulundu" : "elle";
}

export const statusLabels: Record<EmailStatus, string> = {
  yok: "E-posta yok",
  bulundu: "Bulundu",
  elle: "Elle girildi",
  riskli: "Doğrulanamadı",
  gecersiz: "Geçersiz",
};

export const kindLabels = { is: "İş adresi", rol: "Ortak adres", kisisel: "Kişisel adres" } as const;
