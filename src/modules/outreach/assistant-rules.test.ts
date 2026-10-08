import { describe, expect, it } from "vitest";
import { assistantMessages, contextText, toAnswer } from "./assistant-rules";
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
    expect(c).toContain("Kalan kredi: 120");
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

describe("yanıt doğrulama", () => {
  it("bilinmeyen bağlantıları atar, tekrarları birleştirir", () => {
    const a = toAnswer({ yanit: " Merhaba ", baglantilar: ["/panel/raporlar", "/panel/raporlar", "https://kotu.example", "/panel/admin"] });
    expect(a.reply).toBe("Merhaba");
    expect(a.links).toEqual([{ path: "/panel/raporlar", label: "Raporlar" }]);
  });
  it("bağlantı alanı yoksa boş döner; boş yanıtı reddeder", () => {
    expect(toAnswer({ yanit: "tamam" }).links).toEqual([]);
    expect(() => toAnswer({ yanit: "" })).toThrow();
  });
});
