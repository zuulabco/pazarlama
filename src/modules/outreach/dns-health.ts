import type { Provider } from "./presets";

/**
 * Alan adı e-posta sağlığı (SPF, DKIM, DMARC, MX) analizi. Saf fonksiyon: DNS sonuçlarını alır, durum ve
 * "ekleyeceğiniz tam kayıt" önerileri üretir. DNS sorguları `dns-lookup.ts`'tedir.
 */

export type DnsFacts = {
  /** Alan adının TXT kayıtları içindeki "v=spf1" ile başlayanlar. */
  spf: string[];
  /** `_dmarc.alanadi` altındaki "v=DMARC1" ile başlayan kayıtlar. */
  dmarc: string[];
  /** Denenen DKIM seçicilerinden kaydı bulunanlar. */
  dkimFound: string[];
  /** Alan adının MX sunucuları. */
  mx: string[];
};

export type CheckStatus = "ok" | "uyari" | "eksik";
export type DnsCheck = {
  key: "spf" | "dkim" | "dmarc" | "mx";
  title: string;
  status: CheckStatus;
  detail: string;
  /** Eklenecek/düzeltilecek kayıt. */
  fix?: { type: "TXT" | "CNAME"; host: string; value: string };
};

export type DnsReport = { domain: string; checks: DnsCheck[]; ready: boolean; managed: boolean };

/** Sağlayıcıya göre yaygın DKIM seçicileri. */
export const dkimSelectors: Record<Provider, string[]> = {
  google: ["google"],
  gmail: ["google"],
  outlook: ["selector1", "selector2"],
  ozel: ["default", "mail", "k1", "s1", "dkim", "selector1", "google"],
};

const spfInclude: Record<Provider, string | null> = { google: "_spf.google.com", gmail: "_spf.google.com", outlook: "spf.protection.outlook.com", ozel: null };

/** Ücretsiz posta alan adlarının DNS'i sağlayıcıya aittir; kullanıcı kayıt ekleyemez. */
const MANAGED = new Set(["gmail.com", "googlemail.com", "outlook.com", "outlook.com.tr", "hotmail.com", "hotmail.com.tr", "live.com", "msn.com", "yahoo.com", "yandex.com", "icloud.com"]);
export const isManagedDomain = (domain: string) => MANAGED.has(domain.toLowerCase());

export function analyzeDns(domain: string, provider: Provider, f: DnsFacts): DnsReport {
  if (isManagedDomain(domain)) {
    return {
      domain,
      managed: true,
      ready: true,
      checks: [
        {
          key: "spf",
          title: "Alan adı ayarları",
          status: "ok",
          detail: `${domain} adresinin SPF/DKIM/DMARC ayarlarını sağlayıcı yönetir. Ancak ücretsiz adreslerden toplu soğuk e-posta spam'e düşmeye yatkındır; kendi alan adınızdan göndermeniz önerilir.`,
        },
      ],
    };
  }

  const checks: DnsCheck[] = [];
  const include = spfInclude[provider];

  // SPF
  if (f.spf.length === 0) {
    checks.push({
      key: "spf",
      title: "SPF",
      status: "eksik",
      detail: "Alan adınızda SPF kaydı yok. E-postalarınız doğrulanamaz ve spam'e düşebilir.",
      fix: { type: "TXT", host: "@", value: `v=spf1 ${include ? `include:${include} ` : ""}~all`.replace(/\s+/g, " ") },
    });
  } else if (f.spf.length > 1) {
    checks.push({ key: "spf", title: "SPF", status: "uyari", detail: "Birden fazla SPF kaydı var; bu geçersizdir. Tek bir kayıtta birleştirin.", fix: { type: "TXT", host: "@", value: `v=spf1 ${include ? `include:${include} ` : ""}~all`.replace(/\s+/g, " ") } });
  } else {
    const rec = f.spf[0].toLowerCase();
    if (/\+all\b/.test(rec)) checks.push({ key: "spf", title: "SPF", status: "uyari", detail: "SPF kaydı herkese izin veriyor (+all). Bu güvensizdir; ~all ya da -all kullanın." });
    else if (include && !rec.includes(include)) {
      checks.push({ key: "spf", title: "SPF", status: "uyari", detail: `SPF kaydında ${include} yok; ${provider === "gmail" ? "Google" : "Microsoft"} üzerinden gönderilen e-postalar başarısız olabilir.`, fix: { type: "TXT", host: "@", value: f.spf[0].replace(/\s+[~?+-]all\s*$/i, ` include:${include} ~all`) } });
    } else if (/\?all\b/.test(rec)) checks.push({ key: "spf", title: "SPF", status: "uyari", detail: "SPF kaydı tarafsız (?all). ~all ya da -all önerilir." });
    else checks.push({ key: "spf", title: "SPF", status: "ok", detail: "SPF kaydı var ve gönderici sağlayıcınızı kapsıyor." });
  }

  // DKIM
  if (f.dkimFound.length > 0) checks.push({ key: "dkim", title: "DKIM", status: "ok", detail: `DKIM kaydı bulundu (${f.dkimFound.join(", ")}).` });
  else {
    const how =
      provider === "gmail"
        ? "Google Workspace yönetici konsolunda Uygulamalar → Google Workspace → Gmail → E-posta kimlik doğrulama bölümünden DKIM anahtarı oluşturup verilen TXT kaydını ekleyin (host: google._domainkey)."
        : provider === "outlook"
          ? "Microsoft 365 Defender'da DKIM'i etkinleştirin ve verilen iki CNAME kaydını ekleyin (selector1._domainkey ve selector2._domainkey)."
          : "Barındırma sağlayıcınızın panelinden DKIM'i etkinleştirip verilen kaydı ekleyin.";
    checks.push({ key: "dkim", title: "DKIM", status: "eksik", detail: `DKIM kaydı bulunamadı (denenen: ${dkimSelectors[provider].join(", ")}). ${how}` });
  }

  // DMARC
  if (f.dmarc.length === 0) {
    checks.push({
      key: "dmarc",
      title: "DMARC",
      status: "eksik",
      detail: "DMARC kaydı yok. Gmail ve Yahoo, toplu gönderimde en az p=none olan bir DMARC kaydı istiyor.",
      fix: { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=none;" },
    });
  } else {
    const policy = /\bp=(\w+)/i.exec(f.dmarc[0])?.[1]?.toLowerCase();
    checks.push({
      key: "dmarc",
      title: "DMARC",
      status: "ok",
      detail: policy === "none" ? "DMARC kaydı var (p=none: izleme modu). Başlangıç için yeterli; her şey düzgün çalışınca p=quarantine'e geçilebilir." : `DMARC kaydı var (p=${policy ?? "?"}).`,
    });
  }

  // MX (yanıtların gelebilmesi için)
  checks.push(
    f.mx.length > 0
      ? { key: "mx", title: "Posta sunucusu (MX)", status: "ok", detail: "Alan adı e-posta alabiliyor; yanıtlar size ulaşır." }
      : { key: "mx", title: "Posta sunucusu (MX)", status: "eksik", detail: "Alan adında MX kaydı yok; yanıtlar ve geri dönen e-postalar size ulaşamaz." },
  );

  const by = (k: DnsCheck["key"]) => checks.find((c) => c.key === k)?.status;
  return { domain, checks, managed: false, ready: by("spf") === "ok" && by("dkim") === "ok" && by("dmarc") === "ok" && by("mx") === "ok" };
}
