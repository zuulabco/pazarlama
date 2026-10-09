import { describe, expect, it } from "vitest";
import { classifyInbound, messageIds, parseBounce } from "./inbound";
import { campaignCapacity, mailboxCapacity, warmupDailyCap } from "./limits";
import { buildOutgoing, composeText, threadSubject } from "./mime";
import { buildVars, listVariables, renderTemplate, tidy, unfilledVariables } from "./render";
import { defaultSchedule, describeDelay, isWithinWindow, nextRunAt, nextWindowStart, splitDelay, zoned, zonedToUtc } from "./schedule";
import { checkEmail } from "./spam-check";

describe("renderTemplate", () => {
  it("değişkenleri doldurur, yedek metni kullanır, bozuk noktalamayı düzeltir", () => {
    expect(renderTemplate("Merhaba {{first_name|}}, {{company}} için yazıyorum.", { first_name: "Ayşe", company: "Lale Diş" })).toBe("Merhaba Ayşe, Lale Diş için yazıyorum.");
    expect(renderTemplate("Merhaba {{first_name|}}, nasılsınız?", {})).toBe("Merhaba, nasılsınız?");
    expect(renderTemplate("Merhaba {{ first_name | Sayın yetkili }},", {})).toBe("Merhaba Sayın yetkili,");
    expect(renderTemplate("{{bilinmeyen}} x", { first_name: "A" })).toBe("x");
  });
  it("kişiden ve göndericiden değişken üretir (Türkçe büyük harf)", () => {
    const v = buildVars({ name: "ayşe  DEMİR yılmaz", company: " Lale ", city: null, website: "https://www.lale.com.tr/" }, { name: "Elif Yıldız", company: "Yıldız MM" });
    expect(v).toMatchObject({ first_name: "Ayşe", last_name: "Demir Yılmaz", company: "Lale", website: "www.lale.com.tr", sender_first_name: "Elif" });
    expect(v.city).toBeUndefined();
  });
  it("değişkenleri listeler ve doldurulamayanları bulur", () => {
    expect(listVariables("{{first_name}} {{company|x}} {{first_name}}")).toEqual(["first_name", "company"]);
    expect(unfilledVariables("{{first_name}} {{company|yedek}} {{city}}", { company: "" })).toEqual(["first_name", "city"]);
  });
  it("tidy fazla boşlukları ve satırları toplar", () => {
    expect(tidy("a  ,  b \n\n\n\nc")).toBe("a, b\n\nc");
  });
});

describe("schedule", () => {
  it("İstanbul saatini doğru çözer (UTC+3)", () => {
    const z = zoned(new Date("2026-10-08T09:20:00Z"), "Europe/Istanbul"); // Perşembe 12:20
    expect(z).toMatchObject({ y: 2026, mo: 10, d: 8, weekday: 4, minutes: 12 * 60 + 20 });
    expect(zonedToUtc(2026, 10, 8, 9 * 60, "Europe/Istanbul").toISOString()).toBe("2026-10-08T06:00:00.000Z");
  });
  it("pencere içinde kendisini, dışında bir sonraki pencere başlangıcını verir", () => {
    const inside = new Date("2026-10-08T09:20:00Z"); // Perşembe 12:20 İstanbul
    expect(isWithinWindow(inside, defaultSchedule)).toBe(true);
    expect(nextWindowStart(inside, defaultSchedule)).toEqual(inside);
    const evening = new Date("2026-10-08T16:00:00Z"); // Perşembe 19:00 → Cuma 09:00
    expect(nextWindowStart(evening, defaultSchedule)?.toISOString()).toBe("2026-10-09T06:00:00.000Z");
    const friNight = new Date("2026-10-09T17:00:00Z"); // Cuma 20:00 → Pazartesi 09:00
    expect(nextWindowStart(friNight, defaultSchedule)?.toISOString()).toBe("2026-10-12T06:00:00.000Z");
    const early = new Date("2026-10-08T03:00:00Z"); // Perşembe 06:00 → aynı gün 09:00
    expect(nextWindowStart(early, defaultSchedule)?.toISOString()).toBe("2026-10-08T06:00:00.000Z");
  });
  it("hiç gün seçili değilse null; gecikme pencereye çekilir", () => {
    expect(nextWindowStart(new Date(), { ...defaultSchedule, days: [] })).toBeNull();
    // Cuma 17:30 + 1 saat = 18:30 (pencere dışı) → Pazartesi 09:00
    expect(nextRunAt(new Date("2026-10-09T14:30:00Z"), 60, defaultSchedule)?.toISOString()).toBe("2026-10-12T06:00:00.000Z");
  });
  it("gecikmeyi birimlere ayırır ve okunur yazar", () => {
    expect(splitDelay(2880)).toEqual({ value: 2, unit: "days" });
    expect(splitDelay(180)).toEqual({ value: 3, unit: "hours" });
    expect(splitDelay(45)).toEqual({ value: 45, unit: "minutes" });
    expect([describeDelay(0), describeDelay(1440), describeDelay(90)]).toEqual(["Hemen", "1 gün sonra", "90 dakika sonra"]);
  });
});

describe("limits", () => {
  it("saatlik ve günlük limitten kalanın küçüğünü verir", () => {
    expect(mailboxCapacity({ dailyLimit: 20, hourlyLimit: 6 }, { lastHour: 2, last24h: 5 })).toBe(4);
    expect(mailboxCapacity({ dailyLimit: 20, hourlyLimit: 6 }, { lastHour: 0, last24h: 18 })).toBe(2);
    expect(mailboxCapacity({ dailyLimit: 20, hourlyLimit: 6 }, { lastHour: 6, last24h: 6 })).toBe(0);
    expect(campaignCapacity(null, 99)).toBe(Infinity);
    expect(campaignCapacity(50, 60)).toBe(0);
  });
  it("ısınma günlük sınırı kademelidir", () => {
    expect([1, 3, 4, 7, 10, 20, 25, 40].map((d) => warmupDailyCap(d, 50))).toEqual([5, 5, 10, 10, 20, 30, 40, 50]);
    expect(warmupDailyCap(1, 3)).toBe(3);
  });
});

describe("inbound", () => {
  const ours = new Set(["abc@firma.com", "def@firma.com"]);
  it("bounce, ofis dışı, yanıt ve diğerini ayırır", () => {
    expect(classifyInbound({ from: "Mail Delivery Subsystem <mailer-daemon@googlemail.com>", subject: "Delivery Status Notification (Failure)" }, ours)).toBe("bounce");
    expect(classifyInbound({ from: "x@y.com", subject: "Otomatik yanıt: izindeyim" }, ours)).toBe("ooo");
    expect(classifyInbound({ from: "x@y.com", subject: "Re: x", autoSubmitted: "auto-replied", inReplyTo: "<abc@firma.com>" }, ours)).toBe("ooo");
    expect(classifyInbound({ from: "ali@y.com", subject: "Re: Teklif", inReplyTo: "<abc@firma.com>" }, ours)).toBe("yanit");
    expect(classifyInbound({ from: "ali@y.com", subject: "Re: x", references: "<zzz@x.com> <def@firma.com>" }, ours)).toBe("yanit");
    expect(classifyInbound({ from: "ali@y.com", subject: "Merhaba" }, ours)).toBe("diger");
    expect(messageIds("<a@b> <c@d>")).toEqual(["a@b", "c@d"]);
  });
  it("bounce raporundan gönderimi ve ulaşamayan adresi çıkarır", () => {
    const raw = `X-Failed-Recipients: yok@firma.com\nFinal-Recipient: rfc822; yok@firma.com\nStatus: 5.1.1\n\nMessage-ID: <abc@firma.com>\nSubject: x`;
    expect(parseBounce(raw, new Set(["abc@firma.com"]))).toEqual({ messageId: "abc@firma.com", recipient: "yok@firma.com", permanent: true });
    expect(parseBounce("Status: 4.2.2\nFinal-Recipient: rfc822; dolu@x.com").permanent).toBe(false);
  });
});

describe("mime", () => {
  const base = {
    fromName: "Elif Yıldız",
    fromEmail: "elif@firma.com",
    to: "ayse@lale.com",
    subject: "Merhaba",
    body: "Selam Ayşe,\n\nKısa bir sorum var.",
    signature: "Elif\nYıldız MM",
    includeSignature: true,
    identity: "Elif Yıldız · Yıldız Mali Müşavirlik",
    oneClickUrl: "https://adspine.app/api/outreach/unsub/TOKEN",
    messageId: "<m1@firma.com>",
  };
  it("gövdeye imza ve zorunlu abonelik alt bilgisi ekler", () => {
    const t = composeText(base);
    expect(t).toContain("Kısa bir sorum var.\n\nElif\nYıldız MM\n\n--\nElif Yıldız · Yıldız Mali Müşavirlik");
    expect(t).toContain('yanıtlayıp "İPTAL" yazmanız yeterli.');
    expect(t).not.toMatch(/https?:\/\//);
    expect(composeText({ ...base, includeSignature: false })).not.toContain("Yıldız MM\n");
  });
  it("tek tıkla abonelik başlıklarını ve thread başlıklarını koyar", () => {
    const m = buildOutgoing({ ...base, inReplyTo: "<m0@firma.com>", references: ["<m0@firma.com>"] });
    expect(m.headers).toMatchObject({ "List-Unsubscribe": "<https://adspine.app/api/outreach/unsub/TOKEN>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });
    expect(m).toMatchObject({ messageId: "<m1@firma.com>", inReplyTo: "<m0@firma.com>", from: { name: "Elif Yıldız", address: "elif@firma.com" } });
  });
  it("takip adımlarında konuyu aynı konuşmaya bağlar", () => {
    expect(threadSubject("Merhaba", false)).toBe("Merhaba");
    expect(threadSubject("Hatırlatma", true, "Merhaba")).toBe("Re: Merhaba");
    expect(threadSubject("x", true, "Re: Merhaba")).toBe("Re: Merhaba");
  });
});

describe("checkEmail", () => {
  it("temiz bir soğuk e-postaya yüksek puan verir", () => {
    const r = checkEmail("Kısa bir soru", "Merhaba {{first_name|}},\n\nSitenizde randevu formu olmadığını fark ettim. Size 10 dakikalık kısa bir görüşme önerebilir miyim? Uygun olduğunuz bir zamanı yazmanız yeterli, ona göre ayarlarım.");
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.label).toBe("İyi");
  });
  it("spam ifadelerini, büyük harfi, çok bağlantıyı ve sahte Re:'yi yakalar", () => {
    const r = checkEmail("RE: ÜCRETSİZ FIRSAT!!", "SON FIRSAT garanti kazanç! Hemen tıkla https://a.com https://b.com https://c.com");
    expect(r.label).toBe("Riskli");
    expect(r.issues.map((i) => i.text).join(" ")).toMatch(/ifadeler var/);
    expect(r.issues.length).toBeGreaterThanOrEqual(4);
  });
});
