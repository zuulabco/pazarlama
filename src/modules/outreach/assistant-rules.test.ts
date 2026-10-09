import { describe, expect, it } from "vitest";
import { assistantMessages, contextText, fallbackReply, toAnswer } from "./assistant-rules";
import { buildOverview } from "./report-overview";

const reports = {
  overview: buildOverview([], [], 0, 30),
  campaigns: [{ id: "s1", name: "Ajanslara teklif", status: "aktif", sent: 40, replied: 4, bounced: 2, positive: 1, meetings: 0 }],
  mailboxes: [{ id: "m1", email: "info@x.com", sent: 40, replied: 4, bounced: 2, positive: 1, meetings: 0, warmupScore: null, dnsScore: 80 }],
};
const account = { planName: "Başlangıç", credits: 120, senders: { used: 1, limit: 2 }, campaigns: { used: 1, limit: 3 } };

describe("yardımcı bağlamı", () => {
  it("yalnızca kullanıcının rakamlarını içerir", () => {
    const c = contextText(reports, account, 30);
    expect(c).toContain("Kalan Spine Kredi: 120");
    expect(c).toContain("Ajanslara teklif");
    expect(c).toContain("info@x.com");
    expect(c).toContain("ısınma skoru yok");
  });
  it("ileti geçmişini sınırlar ve sistem iletisine bağlamı koyar", () => {
    const hist = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? ("assistant" as const) : ("user" as const), content: "x".repeat(3000) }));
    const m = assistantMessages(hist, "BAĞLAM");
    expect(m).toHaveLength(9);
    expect(m[0].content).toContain("BAĞLAM");
    expect(m[1].content.length).toBe(1000);
  });
});

describe("yanıt metni", () => {
  it("işaretleri temizler ve konuya göre en çok iki bağlantı seçer", () => {
    const a = toAnswer("**Önemli:** geri dönen oranı yüksek.\n```json\nx```", "Hangi gönderici adresim sorunlu?");
    expect(a.reply).not.toContain("**");
    expect(a.reply).not.toContain("```");
    expect(a.links.length).toBeLessThanOrEqual(2);
    expect(a.links[0]).toEqual({ path: "/panel/posta-kutulari", label: "Gönderici adresleri" });
  });
  it("konu yoksa bağlantı vermez", () => {
    expect(toAnswer("Merhaba!", "selam").links).toEqual([]);
  });
  it("model yanıt vermezse rakam özeti döner", () => {
    const f = fallbackReply("Paket: Ücretsiz. Kalan Spine Kredi: 25.\nSon 30 gün: 0 e-posta.\nKampanyalar: x");
    expect(f).toContain("Kalan Spine Kredi: 25");
    expect(f).toContain("0 e-posta");
    expect(f).not.toContain("Kampanyalar: x");
  });
});

describe("hesap verilerine erişim: yönlendirme ve arama", () => {
  it("soruya göre veri türlerini seçer; devam sorusunda önceki soruyu kullanır", async () => {
    const { routeTopics } = await import("./assistant-rules");
    expect([...routeTopics("kayıtlı kişilerimde reklam sektöründe olan var mı?")]).toContain("kisiler");
    expect([...routeTopics("takvimimde herhangi bir plan var mı?")]).toContain("plan");
    expect([...routeTopics("kimler yanıt verdi")]).toContain("gelen");
    expect([...routeTopics("peki yarın?", "takvimimde ne var")]).toContain("plan");
  });
  it("dolgu kelimeleri atar, eş anlamlıları ekler", async () => {
    const { searchTerms } = await import("./assistant-rules");
    const { terms, expanded } = searchTerms("kayıtlı kişilerimde reklam sektöründe olan var mı?");
    expect(terms).toEqual(["reklam"]);
    expect(expanded).toEqual(expect.arrayContaining(["reklam", "ajans", "digital", "marketing"]));
  });
  it("kayıtlı kişilerde şirket adı, alan adı ve unvandan eşleştirir", async () => {
    const { matchContacts, searchTerms, contactsSection } = await import("./assistant-rules");
    const rows = [
      { name: "Ilker G.", company: "D Generation", job_title: "Founder", city: "Izmir", website: "http://dgeneration.com.tr", email: "ilker@dgeneration.com.tr", email_status: "bulundu" },
      { name: "Luna K.", company: "Luna Kreatif", job_title: "Co-Founder", city: "Izmir", website: null, email: "f@lunakreatif.com", email_status: "bulundu" },
      { name: "Ali V.", company: "Vega Çelik Sanayi", job_title: "Satın Alma Müdürü", city: "Kocaeli", website: null, email: "a@vegacelik.com", email_status: "bulundu" },
    ];
    const { terms, expanded } = searchTerms("reklam sektöründe kimler var");
    const hit = matchContacts(rows, expanded);
    expect(hit.map((r) => r.company)).toEqual(["Luna Kreatif"]);
    const text = contactsSection({ total: 3, withEmail: 3, lists: [{ name: "Test", count: 3 }], rows, terms, expanded });
    expect(text).toContain("Kayıtlı kişiler: toplam 3");
    expect(text).toContain("Luna Kreatif");
    expect(text).toContain("Tüm kayıtlı kişiler");
  });
  it("takvim bölümü bugünü, yaklaşanları ve geçmiş tamamlanmamışları ayırır", async () => {
    const { planSection } = await import("./assistant-rules");
    const now = new Date("2026-10-09T10:00:00Z");
    const text = planSection(
      [
        { startsAt: "2026-10-08T07:00:00Z", kind: "Görev", title: "Teklif hazırla", withName: null, location: null, allDay: false, done: false },
        { startsAt: "2026-10-10T11:00:00Z", kind: "Toplantı", title: "Lale ile görüşme", withName: "Ayşe", location: "Kadıköy", allDay: false, done: false },
      ],
      now,
    );
    expect(text).toContain("Bugün:");
    expect(text).toContain("yaklaşan 1 plan");
    expect(text).toContain("Lale ile görüşme (Ayşe)");
    expect(text).toContain("Geçmiş ve tamamlanmamış 1 plan");
  });
});

describe("ajan: niyet kapısı ve plan girdisi", () => {
  it("iş isteği olabilecek mesajları ayırır, sıradan soruları atlar", async () => {
    const { maybeAction } = await import("./assistant-rules");
    for (const t of ["yarın saat 12:00 da dişçi randevum var", "istanbuldaki makine mühendislerini ara", "gelen kutusunu aç", "cuma 14:30 toplantı ekle"]) expect(maybeAction(t), t).toBe(true);
    for (const t of ["otomasyonlarım nasıl gidiyor?", "geri dönen oranım neden önemli?", "kayıtlı kişilerimde reklam sektöründe olan var mı?"]) expect(maybeAction(t), t).toBe(false);
  });
  it("model çıktısını güvenli niyete çevirir", async () => {
    const { toIntent } = await import("./assistant-rules");
    expect(toIntent({ niyet: "musteri_ara", sorgu: "İstanbul'daki makine mühendisleri" })).toMatchObject({ niyet: "musteri_ara" });
    expect(toIntent({ niyet: "musteri_ara", sorgu: "" })).toEqual({ niyet: "soru" });
    expect(toIntent({ niyet: "sayfa_ac", sayfa: "gelen-kutusu" })).toMatchObject({ niyet: "sayfa_ac", sayfa: "gelen-kutusu" });
    expect(toIntent({ niyet: "sayfa_ac", sayfa: "/etc/passwd" })).toEqual({ niyet: "soru" });
    expect(toIntent({ niyet: "baska" }).niyet).toBe("soru");
    expect(toIntent(null).niyet).toBe("soru");
  });
  it("planı Türkiye saatiyle kaydeder; saat yoksa tüm gün olur ve şema geçer", async () => {
    const { planInputFrom, whenText } = await import("./assistant-rules");
    const { planInputSchema } = await import("@/modules/plan/types");
    const timed = planInputFrom({ kind: "randevu", title: "Dişçi randevu", date: "2026-10-10", time: "12:00", endTime: null, allDay: false, withName: null, location: null, details: null });
    expect(timed.startsAt).toBe("2026-10-10T09:00:00.000Z");
    expect(timed.allDay).toBe(false);
    expect(() => planInputSchema.parse(timed)).not.toThrow();
    expect(whenText(timed.startsAt, false)).toContain("12:00");
    const noTime = planInputFrom({ kind: "gorev", title: "Teklif hazırla", date: "2026-10-12", time: null, endTime: null, allDay: false, withName: null, location: null, details: null });
    expect(noTime.allDay).toBe(true);
    expect(noTime.startsAt).toBe("2026-10-11T21:00:00.000Z");
    expect(() => planInputSchema.parse(noTime)).not.toThrow();
  });
});
