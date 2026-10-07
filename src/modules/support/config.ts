/**
 * Destek otomasyonu kurulum ayarları.
 * Yalnızca gizli olmayan bilgiler tutulur; şifre ve erişim anahtarları kullanıcının kendi n8n hesabında kalır.
 */

export const languages = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "İngilizce" },
] as const;

export type OwnerLanguage = (typeof languages)[number]["code"];

export type SupportConfig = {
  businessName: string;
  /** Mesajların çevrileceği, ekibinizin okuduğu dil */
  language: OwnerLanguage;
  whatsapp: boolean;
  email: boolean;
  notifyEmail: boolean;
  notifyWhatsapp: boolean;
  adminEmail: string;
  adminPhone: string;
  phoneNumberId: string;
  fromEmail: string;
  logSheet: boolean;
  sheetId: string;
  sheetTab: string;
  autoReply: boolean;
  replyText: string;
};

export const defaultReplyText =
  "Merhaba! Mesajınız bize ulaştı. Ekibimiz en geç 24 saat içinde size dönüş yapacak. Bizi tercih ettiğiniz için teşekkür ederiz.";

export const defaultConfig: SupportConfig = {
  businessName: "",
  language: "tr",
  whatsapp: true,
  email: false,
  notifyEmail: true,
  notifyWhatsapp: false,
  adminEmail: "",
  adminPhone: "",
  phoneNumberId: "",
  fromEmail: "",
  logSheet: true,
  sheetId: "",
  sheetTab: "Mesajlar",
  autoReply: true,
  replyText: defaultReplyText,
};

/** Google Sheets'e kaydedilen sütunlar; tablonun ilk satırına bu sırayla yazılmalıdır. */
export const sheetHeaders = [
  "Tarih",
  "Referans",
  "Kanal",
  "Gönderen",
  "Ad",
  "Dil",
  "Öncelik",
  "Özet",
  "Çeviri",
  "Orijinal Mesaj",
  "Durum",
] as const;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (v: string) => emailPattern.test(v.trim());

/** "+90 532 123 45 67", "0532 123 45 67" gibi girişleri 905321234567 biçimine getirir; geçersizse boş döner. */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Türkiye'de yaygın yazım: 0532… (11 hane) ya da 532… (10 hane)
  if (digits.length === 11 && digits.startsWith("0")) digits = `90${digits.slice(1)}`;
  else if (digits.length === 10 && digits.startsWith("5")) digits = `90${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : "";
}

/** Tablo adresini ya da doğrudan kimliği kabul eder; Google Sheets kimliğini döndürür, geçersizse boş. */
export function parseSheetId(input: string): string {
  const value = input.trim();
  const fromUrl = value.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/);
  if (fromUrl) return fromUrl[1];
  return /^[A-Za-z0-9_-]{20,}$/.test(value) ? value : "";
}

export const needsSender = (c: SupportConfig) => c.notifyEmail || (c.email && c.autoReply);
export const needsPhoneNumberId = (c: SupportConfig) => c.notifyWhatsapp || (c.whatsapp && c.autoReply);

export type ConfigErrors = Partial<Record<keyof SupportConfig | "channels" | "outputs", string>>;

export function validateConfig(c: SupportConfig): ConfigErrors {
  const e: ConfigErrors = {};
  if (!c.businessName.trim()) e.businessName = "İşletme adını yazın.";
  if (!c.whatsapp && !c.email) e.channels = "Mesajları hangi kanaldan alacağınızı seçin.";
  if (!c.notifyEmail && !c.notifyWhatsapp && !c.logSheet) {
    e.outputs = "Mesajların nereye ulaşacağını seçin: e-posta, WhatsApp ya da tablo.";
  }
  if (c.notifyEmail && !isEmail(c.adminEmail)) e.adminEmail = "Geçerli bir e-posta adresi yazın.";
  if (c.notifyWhatsapp && !normalizePhone(c.adminPhone)) e.adminPhone = "Ülke koduyla bir telefon numarası yazın (örn. 90 532 123 45 67).";
  if (needsPhoneNumberId(c) && !/^\d{8,20}$/.test(c.phoneNumberId.trim())) {
    e.phoneNumberId = "Meta panelindeki “Phone number ID” değerini yazın (yalnızca rakamlar).";
  }
  if (needsSender(c) && !isEmail(c.fromEmail)) e.fromEmail = "Gönderen e-posta adresini yazın.";
  if (c.logSheet && !parseSheetId(c.sheetId)) e.sheetId = "Tablonun adresini ya da kimliğini yapıştırın.";
  if (c.logSheet && !c.sheetTab.trim()) e.sheetTab = "Sayfa (sekme) adını yazın.";
  if (c.autoReply) {
    if (!c.replyText.trim()) e.replyText = "Müşteriye gidecek yanıtı yazın.";
    else if (c.replyText.length > 600) e.replyText = "Yanıt en fazla 600 karakter olabilir.";
  }
  return e;
}

/** Saklanan/dışarıdan gelen veriyi güvenli bir ayara çevirir; bilinmeyen ya da hatalı alanlar varsayılana düşer. */
export function coerceConfig(raw: unknown): SupportConfig {
  const src = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = { ...defaultConfig };
  for (const [key, fallback] of Object.entries(defaultConfig)) {
    const v = src[key];
    if (typeof v === typeof fallback) out[key] = v;
  }
  const c = out as SupportConfig;
  return { ...c, language: languages.some((l) => l.code === c.language) ? c.language : "tr" };
}
