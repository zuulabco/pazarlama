/**
 * Ana sayfa kuralları (saf): kurulum adımları ve "dikkat edilecekler" listesi. Her madde ilgili sayfaya bağlanır;
 * böylece ana sayfa bölümleri birbirine bağlayan tek yol haritası olur.
 */

export type HomeFacts = {
  connectedMailboxes: number;
  brokenMailboxes: { email: string }[];
  warmupOn: number;
  contacts: number;
  campaigns: number;
  sent: number;
  replies: number;
  unread: number;
  bounceRate: number;
  credits: number;
};

export type Step = { key: string; title: string; hint: string; href: string; cta: string; done: boolean };

export function setupSteps(f: HomeFacts): Step[] {
  return [
    { key: "adres", title: "Gönderici adresi bağlayın", hint: "E-postaları kendi adresinizden göndermek için Google hesabınızla tek tıkla bağlanın.", href: "/panel/posta-kutulari", cta: "Adres bağla", done: f.connectedMailboxes > 0 },
    { key: "isinma", title: "Isındırmayı açın", hint: "Yeni adreslerin itibarı haftalar içinde oluşur; erken başlamak spam'e düşmeyi azaltır.", href: "/panel/posta-kutulari", cta: "Isındırmayı aç", done: f.warmupOn > 0 },
    { key: "kisi", title: "İlk kişileri ekleyin", hint: "Unvan ve sektöre göre listeleyin, seçtiklerinizi e-postalarıyla birlikte kaydedin.", href: "/panel/kisi-bul", cta: "Müşteri bul", done: f.contacts > 0 },
    { key: "kampanya", title: "İlk otomasyonunuzu başlatın", hint: "Adspine AI ile adımları yazdırın, kişileri ekleyin ve başlatın.", href: "/panel/otomasyon", cta: "Otomasyon oluştur", done: f.sent > 0 || f.campaigns > 0 },
    { key: "yanit", title: "İlk yanıtı alın", hint: "Yanıtlar Gelen kutusunda toplanır ve otomatik etiketlenir.", href: "/panel/gelen-kutusu", cta: "Gelen kutusu", done: f.replies > 0 },
  ];
}

export type Attention = { key: string; tone: "danger" | "warn" | "info"; text: string; href: string; cta: string };

export function attention(f: HomeFacts): Attention[] {
  const list: Attention[] = [];
  if (f.unread > 0) list.push({ key: "okunmamis", tone: "info", text: `${f.unread} okunmamış yanıtınız var.`, href: "/panel/gelen-kutusu", cta: "Yanıtla" });
  for (const m of f.brokenMailboxes.slice(0, 2)) list.push({ key: `hata-${m.email}`, tone: "danger", text: `${m.email} adresine bağlanılamıyor; bu adresten gönderim durdu.`, href: "/panel/posta-kutulari", cta: "Düzelt" });
  if (f.sent >= 20 && f.bounceRate >= 5.5) list.push({ key: "geri", tone: "danger", text: `Geri dönen oranınız %${f.bounceRate.toFixed(1).replace(".", ",")}: güvenli sınırın üzerinde. Listeyi temizleyin, gönderimi azaltın.`, href: "/panel/raporlar", cta: "Raporlara bak" });
  else if (f.sent >= 20 && f.bounceRate >= 3) list.push({ key: "geri", tone: "warn", text: `Geri dönen oranınız %${f.bounceRate.toFixed(1).replace(".", ",")}; %2 altı hedeflenir.`, href: "/panel/raporlar", cta: "Raporlara bak" });
  if (f.credits <= 10) list.push({ key: "kredi", tone: "warn", text: f.credits === 0 ? "Krediniz bitti; yeni kişi eklemek için paketinizi yükseltin." : `Yalnızca ${f.credits} Krediniz kaldı.`, href: "/panel/kisi-bul", cta: "Müşteri bul" });
  return list;
}

export type Focus = { tone: "danger" | "warn" | "info" | "ok"; title: string; text: string; href: string; cta: string; progress: { done: number; total: number } | null };

/**
 * Ana sayfanın tek odak kartı: şimdi yapılması en yararlı şey. Sıra: sorunlar (bağlantı, geri dönen) → yanıt bekleyenler →
 * kurulumun sıradaki adımı → düşük kredi → "yeni kişi bul".
 */
export function focusOf(f: HomeFacts): Focus {
  const steps = setupSteps(f);
  const done = steps.filter((s) => s.done).length;
  const progress = done < steps.length ? { done, total: steps.length } : null;
  const problem = attention(f).find((a) => a.tone === "danger");
  if (problem) return { tone: "danger", title: "Önce bunu çözelim", text: problem.text, href: problem.href, cta: problem.cta, progress };
  if (f.unread > 0) return { tone: "info", title: `${f.unread} yeni yanıtınız var`, text: "Yanıt veren kişilere dönmek, sonucu en çok etkileyen adımdır.", href: "/panel/gelen-kutusu", cta: "Yanıtla", progress };
  const next = steps.find((s) => !s.done);
  if (next) return { tone: "info", title: next.title, text: next.hint, href: next.href, cta: next.cta, progress };
  const low = attention(f).find((a) => a.key === "kredi" || a.key === "geri");
  if (low) return { tone: "warn", title: "Dikkat edilecek bir şey var", text: low.text, href: low.href, cta: low.cta, progress };
  return { tone: "ok", title: "Her şey yolunda", text: "Yeni kişiler bulup otomasyonlarınıza ekleyerek devam edin.", href: "/panel/kisi-bul", cta: "Müşteri bul", progress };
}
