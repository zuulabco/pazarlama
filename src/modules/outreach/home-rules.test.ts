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

import { focusOf } from "./home-rules";

describe("odak kartı", () => {
  const ready: HomeFacts = { ...base, connectedMailboxes: 1, warmupOn: 1, contacts: 5, campaigns: 1, sent: 30, replies: 2 };
  it("önce sorunu gösterir", () => {
    expect(focusOf({ ...ready, unread: 3, brokenMailboxes: [{ email: "a@x.com" }] })).toMatchObject({ tone: "danger", href: "/panel/posta-kutulari" });
  });
  it("sonra okunmamış yanıtı, sonra kurulum adımını", () => {
    expect(focusOf({ ...ready, unread: 2 }).title).toBe("2 yeni yanıtınız var");
    expect(focusOf({ ...base, connectedMailboxes: 1 })).toMatchObject({ href: "/panel/posta-kutulari", progress: { done: 1, total: 5 } });
  });
  it("her şey tamamsa kişi bulmaya yönlendirir", () => {
    expect(focusOf(ready)).toMatchObject({ tone: "ok", href: "/panel/kisi-bul", progress: null });
  });
});
