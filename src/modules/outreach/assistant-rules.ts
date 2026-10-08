import { z } from "zod";
import type { ReportsData } from "./reports";

/**
 * Yapay zekâ yardımcısı (saf kısım): kullanıcının kendi rakamlarından bağlam metni kurar, modele verilecek iletileri hazırlar ve
 * model çıktısını güvenli hâle getirir. Model yalnızca verilen rakamlara dayanır; bağlantılar sabit bir listeden seçilir.
 */

export const assistantLinks = [
  { path: "/panel/kisi-bul", label: "Kişi bul" },
  { path: "/panel/kisiler", label: "Kişiler" },
  { path: "/panel/kampanyalar", label: "Kampanyalar" },
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
      content: `Adspine'ın soğuk e-posta otomasyonu için Türkçe yardımcısısın (kişi bulma, kampanyalar, gelen kutusu, raporlar, gönderici adresleri, ısındırma).
Sadece JSON döndür: {"yanit": "...", "baglantilar": ["/panel/..."]}

Kurallar:
- Rakamlar yalnızca aşağıdaki "Kullanıcının verileri"nden gelir. Orada olmayan bir rakamı, kampanyayı ya da sonucu uydurma; veri yoksa "henüz veri yok" de.
- Elinde gelir, kazanç, satış tutarı, açılma ya da tıklama verisi YOK. Bunlar sorulursa "bu veriyi tutmuyoruz" de ve sıfır deme; yalnızca verilen rakamlardan (gönderilen, yanıt, olumlu yanıt, toplantı, geri dönen) konuş.
- Kısa ve somut ol (en çok 6 cümle). Madde işareti gerekiyorsa her satıra "- " koy. Markdown başlığı kullanma.
- Öneri verirken gerekçeyi verideki rakama bağla (örn. geri dönen %5,5 üzerindeyse gönderimi azaltmayı ve listeyi temizlemeyi öner).
- Genel kurallar: yeni adres günde 5 e-postayla başlar ve haftalar içinde artar; geri dönen oranı %2 altı hedeftir, %5 üstü tehlikelidir; soğuk e-postayı ana alan adından gönderme; her e-postada abonelikten çıkma bağlantısı olmalı.
- Kampanya metni yazman istenirse kısa bir örnek yaz, ama gerçek yazım için Kampanyalar > adım editöründeki "Adspine AI ile yaz"ı öner.
- Yapamayacağın bir işi (örn. e-posta göndermek, veri silmek) yapıyormuş gibi davranma; ilgili sayfaya yönlendir.
- baglantilar: en çok 2 yol, yalnızca şunlardan: ${assistantLinks.map((l) => l.path).join(", ")}. Gerek yoksa boş dizi.

Kullanıcının verileri:
${context}`,
    },
    ...history.slice(-8).map((h) => ({ role: h.role, content: h.content.slice(0, 1000) })),
  ];
}

const outSchema = z.object({ yanit: z.string().min(1), baglantilar: z.array(z.string()).default([]) });

/** Model çıktısını doğrular: yalnızca bilinen sayfalara bağlantı verilir. */
export function toAnswer(raw: unknown): { reply: string; links: { path: string; label: string }[] } {
  const o = outSchema.parse(raw);
  const links = [...new Set(o.baglantilar)].map((p) => assistantLinks.find((l) => l.path === p)).filter((l): l is (typeof assistantLinks)[number] => Boolean(l)).slice(0, 2);
  return { reply: o.yanit.trim().slice(0, 1500), links: links.map((l) => ({ path: l.path, label: l.label })) };
}
