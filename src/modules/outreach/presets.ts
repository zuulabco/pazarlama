/** Posta sağlayıcı ön ayarları ve tahmini (saf). */

export type Provider = "gmail" | "outlook" | "ozel";

export type ServerConfig = { host: string; port: number; secure: boolean };

export const providerLabels: Record<Provider, string> = { gmail: "Google (Gmail / Workspace)", outlook: "Microsoft (Outlook / 365)", ozel: "Diğer (SMTP/IMAP)" };

const PERSONAL_OUTLOOK = new Set(["outlook.com", "outlook.com.tr", "hotmail.com", "hotmail.com.tr", "live.com", "msn.com", "windowslive.com"]);
const PERSONAL_GOOGLE = new Set(["gmail.com", "googlemail.com"]);

/** E-posta alan adından sağlayıcıyı tahmin eder; özel alan adlarında null (MX ile bakılır). */
export function guessProvider(email: string): Provider | null {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  if (PERSONAL_GOOGLE.has(domain)) return "gmail";
  if (PERSONAL_OUTLOOK.has(domain)) return "outlook";
  return null;
}

/** MX kayıtlarından sağlayıcıyı çıkarır (Google Workspace / Microsoft 365 özel alan adları için). */
export function providerFromMx(exchanges: string[]): Provider | null {
  const all = exchanges.join(" ").toLowerCase();
  if (/google\.com|googlemail\.com/.test(all)) return "gmail";
  if (/protection\.outlook\.com|outlook\.com/.test(all)) return "outlook";
  return null;
}

export function presetFor(provider: Provider, email: string): { smtp: ServerConfig; imap: ServerConfig } {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  if (provider === "gmail") return { smtp: { host: "smtp.gmail.com", port: 465, secure: true }, imap: { host: "imap.gmail.com", port: 993, secure: true } };
  if (provider === "outlook") {
    // Kişisel Outlook/Hotmail hesapları ile Microsoft 365 hesaplarının SMTP sunucuları farklıdır.
    const smtpHost = PERSONAL_OUTLOOK.has(domain) ? "smtp-mail.outlook.com" : "smtp.office365.com";
    return { smtp: { host: smtpHost, port: 587, secure: false }, imap: { host: "outlook.office365.com", port: 993, secure: true } };
  }
  const host = domain || "mail.example.com";
  return { smtp: { host: `smtp.${host}`, port: 465, secure: true }, imap: { host: `imap.${host}`, port: 993, secure: true } };
}

/** Sağlayıcıya göre "şifre" alanında ne istendiğini anlatan yönlendirme. */
export const passwordHelp: Record<Provider, { label: string; steps: string[]; link?: { href: string; text: string } }> = {
  gmail: {
    label: "Uygulama şifresi",
    steps: [
      "Google hesabınızda 2 adımlı doğrulamayı açın.",
      "“Uygulama şifreleri” sayfasında yeni bir şifre oluşturun (ad: Adspine).",
      "Çıkan 16 haneli şifreyi buraya yapıştırın (hesap şifrenizi değil).",
      "Workspace kullanıyorsanız yöneticinizin uygulama şifrelerine ve IMAP erişimine izin verdiğinden emin olun.",
    ],
    link: { href: "https://myaccount.google.com/apppasswords", text: "Uygulama şifresi oluştur" },
  },
  outlook: {
    label: "Uygulama şifresi",
    steps: [
      "Microsoft hesabınızda iki adımlı doğrulamayı açın.",
      "Güvenlik sayfasından bir uygulama şifresi oluşturun ve buraya yapıştırın.",
      "Microsoft 365 kuruluşlarında SMTP kimlik doğrulaması yönetici tarafından kapatılmış olabilir; hata alırsanız BT yöneticinize sorun.",
    ],
    link: { href: "https://account.live.com/proofs/AppPassword", text: "Uygulama şifresi oluştur" },
  },
  ozel: {
    label: "Şifre",
    steps: ["Barındırma sağlayıcınızın verdiği SMTP/IMAP sunucu bilgilerini ve posta kutusu şifresini girin.", "Sunucu adlarını “Sunucu ayarları” bölümünden düzeltebilirsiniz."],
  },
};
