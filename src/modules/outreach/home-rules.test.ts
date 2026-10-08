import { describe, expect, it } from "vitest";
import { attention, setupSteps, type HomeFacts } from "./home-rules";

const base: HomeFacts = { connectedMailboxes: 0, brokenMailboxes: [], warmupOn: 0, contacts: 0, campaigns: 0, sent: 0, replies: 0, unread: 0, bounceRate: 0, credits: 100 };

describe("kurulum adımları", () => {
  it("yeni hesapta hiçbiri tamam değildir", () => {
    expect(setupSteps(base).every((s) => !s.done)).toBe(true);
  });
  it("durumdan tamamlananları işaretler", () => {
    const done = setupSteps({ ...base, connectedMailboxes: 1, contacts: 4, sent: 10 }).filter((s) => s.done).map((s) => s.key);
    expect(done).toEqual(["adres", "kisi", "kampanya"]);
  });
});

describe("dikkat edilecekler", () => {
  it("sağlıklı hesapta boştur", () => {
    expect(attention({ ...base, sent: 50, bounceRate: 1 })).toEqual([]);
  });
  it("okunmamış yanıt, bozuk adres, yüksek geri dönen ve düşük kredi uyarır", () => {
    const a = attention({ ...base, unread: 3, brokenMailboxes: [{ email: "a@x.com" }], sent: 40, bounceRate: 6, credits: 4 });
    expect(a.map((x) => x.key)).toEqual(["okunmamis", "hata-a@x.com", "geri", "kredi"]);
    expect(a.find((x) => x.key === "geri")?.tone).toBe("danger");
  });
  it("az gönderimde geri dönen oranına uyarı vermez; orta oran uyarıdır", () => {
    expect(attention({ ...base, sent: 10, bounceRate: 20 })).toEqual([]);
    expect(attention({ ...base, sent: 30, bounceRate: 4 })[0].tone).toBe("warn");
  });
});
