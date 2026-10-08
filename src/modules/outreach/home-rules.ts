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
    { key: "kisi", title: "İlk kişileri ekleyin", hint: "Unvan ve sektöre göre listeleyin, seçtiklerinizi e-postalarıyla birlikte kaydedin.", href: "/panel/kisi-bul", cta: "Kişi bul", done: f.contacts > 0 },
    { key: "kampanya", title: "İlk kampanyanızı başlatın", hint: "Adspine AI ile adımları yazdırın, kişileri ekleyin ve başlatın.", href: "/panel/kampanyalar", cta: "Kampanya oluştur", done: f.sent > 0 || f.campaigns > 0 },
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
  if (f.credits <= 10) list.push({ key: "kredi", tone: "warn", text: f.credits === 0 ? "Krediniz bitti; yeni kişi eklemek için paketinizi yükseltin." : `Yalnızca ${f.credits} krediniz kaldı.`, href: "/panel/kisi-bul", cta: "Kişi bul" });
  return list;
}
