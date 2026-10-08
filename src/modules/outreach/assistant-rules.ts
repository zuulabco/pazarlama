import type { ReportsData } from "./reports";

/**
 * Yapay zekâ yardımcısı (saf kısım): kullanıcının kendi rakamlarından bağlam metni kurar, modele verilecek iletileri hazırlar ve
 * model çıktısını güvenli hâle getirir. Model yalnızca verilen rakamlara dayanır; bağlantılar sabit bir listeden seçilir.
 */

export const assistantLinks = [
  { path: "/panel/kisi-bul", label: "Kişi bul" },
  { path: "/panel/kisiler", label: "Kişiler" },
  { path: "/panel/otomasyon", label: "Otomasyon" },
  { path: "/panel/gelen-kutusu", label: "Gelen kutusu" },
  { path: "/panel/raporlar", label: "Raporlar" },
  { path: "/panel/posta-kutulari", label: "Gönderici adresleri" },
] as const;

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type AssistantAccount = { planName: string; credits: number; senders: { used: number; limit: number }; campaigns: { used: number; limit: number } };

const pct = (n: number) => `%${n.toFixed(1)}`;

/** Modele verilecek, yalnızca kullanıcıya ait rakamlar. */
export function contextText(r: ReportsData, a: AssistantAccount, days: number): string {
  const t = r.overview.totals;
  const lines = [
    `Paket: ${a.planName}. Kalan kredi: ${a.credits}. Gönderici adresi: ${a.senders.used}/${a.senders.limit}. Kampanya: ${a.campaigns.used}/${a.campaigns.limit}.`,
    `Son ${days} gün: ${t.sent} e-posta gönderildi, ${t.replied} yanıt (${pct(r.overview.rates.reply)}), ${t.positive} olumlu yanıt, ${t.meetings} toplantı, ${t.bounced} geri dönen (${pct(r.overview.rates.bounce)}), ${t.unsubscribed} abonelikten çıkan.`,
  ];
  if (r.campaigns.length) {
    lines.push("Kampanyalar:");
    for (const c of r.campaigns.slice(0, 8)) lines.push(`- ${c.name} (${c.status}): ${c.sent} gönderilen, ${c.replied} yanıt, ${c.positive} olumlu, ${c.bounced} geri dönen`);
  }
  if (r.mailboxes.length) {
    lines.push("Gönderici adresleri:");
    for (const m of r.mailboxes.slice(0, 8)) lines.push(`- ${m.email}: ${m.sent} gönderilen, ${m.bounced} geri dönen, kurulum puanı ${m.dnsScore ?? "bilinmiyor"}, ısınma skoru ${m.warmupScore ?? "yok"}`);
  }
  return lines.join("\n");
}

export function assistantMessages(history: ChatTurn[], context: string) {
  return [
    {
      role: "system" as const,
      content: `Adspine'ın soğuk e-posta otomasyonu için Türkçe yardımcısısın (kişi bulma, otomasyonlar, gelen kutusu, raporlar, gönderici adresleri, ısındırma).
Yalnızca düz Türkçe metinle yanıt ver (JSON ya da kod bloğu yok).

Kurallar:
- Rakamlar yalnızca aşağıdaki "Kullanıcının verileri"nden gelir. Orada olmayan bir rakamı, otomasyonu ya da sonucu uydurma; veri yoksa "henüz veri yok" de.
- Elinde gelir, kazanç, satış tutarı, açılma ya da tıklama verisi YOK. Bunlar sorulursa "bu veriyi tutmuyoruz" de ve sıfır deme; yalnızca verilen rakamlardan (gönderilen, yanıt, olumlu yanıt, toplantı, geri dönen) konuş.
- Kısa ve somut ol (en çok 6 cümle). Madde işareti gerekiyorsa her satıra "- " koy. Markdown başlığı kullanma.
- Öneri verirken gerekçeyi verideki rakama bağla (örn. geri dönen %5,5 üzerindeyse gönderimi azaltmayı ve listeyi temizlemeyi öner).
- Genel kurallar: yeni adres günde 5 e-postayla başlar ve haftalar içinde artar; geri dönen oranı %2 altı hedeftir, %5 üstü tehlikelidir; soğuk e-postayı ana alan adından gönderme; her e-postada abonelikten çıkma bağlantısı olmalı.
- Otomasyon metni yazman istenirse kısa bir örnek yaz, ama gerçek yazım için Otomasyonlar > adım editöründeki "Adspine AI ile yaz"ı öner.
- Yapamayacağın bir işi (örn. e-posta göndermek, veri silmek) yapıyormuş gibi davranma; ilgili sayfaya yönlendir.

Kullanıcının verileri:
${context}`,
    },
    ...history.slice(-8).map((h) => ({ role: h.role, content: h.content.slice(0, 1000) })),
  ];
}

/** Konudan ilgili sayfaları seçer (kural tabanlı; model bağlantı üretmez). En çok 2. */
const topics: { path: string; words: RegExp }[] = [
  { path: "/panel/posta-kutulari", words: /gönderici|adres|ısın|spam|geri dön|bounce|dmarc|spf/i },
  { path: "/panel/gelen-kutusu", words: /yanıt|gelen kutusu|cevap|toplantı/i },
  { path: "/panel/otomasyon", words: /otomasyon|adım|e-posta dizi|metin|yaz/i },
  { path: "/panel/kisi-bul", words: /kişi|liste|kredi|unvan|bul/i },
  { path: "/panel/raporlar", words: /rapor|oran|performans|nasıl gidiyor|gönderilen/i },
];

export function linksFor(question: string): { path: string; label: string }[] {
  const text = question; // yalnızca sorudan: yanıt metninden bağlantı çıkarmak gereksiz öneriler üretiyordu
  return topics
    .filter((t) => t.words.test(text))
    .slice(0, 2)
    .map((t) => assistantLinks.find((l) => l.path === t.path)!)
    .map((l) => ({ path: l.path, label: l.label }));
}

/** Model metnini temizler: kalın/başlık işaretleri ve kod çitleri atılır, uzunluk sınırlanır. */
export function cleanReply(text: string): string {
  return text
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .trim()
    .slice(0, 1500);
}

/** Model yanıt veremediğinde: hata göstermek yerine elimizdeki rakamları özetler. */
export function fallbackReply(context: string): string {
  return `Adspine AI şu an yanıt üretemedi; bu arada son durumunuz:\n${context.split("\n").slice(0, 2).join("\n")}\nBirazdan tekrar sorabilirsiniz.`;
}

export function toAnswer(text: string, question: string): { reply: string; links: { path: string; label: string }[] } {
  const reply = cleanReply(text);
  return { reply, links: linksFor(question) };
}
