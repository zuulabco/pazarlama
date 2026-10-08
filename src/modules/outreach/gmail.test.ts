import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { sendViaGmail, newInboxMessageIds, getRaw, GmailApiError, googleConfigured } = await import("./gmail");
const { deliver } = await import("./mailer");
const { classifySmtpFailure } = await import("./sender");

type Call = { url: string; init?: RequestInit };
let calls: Call[] = [];
let handler: (url: string, init?: RequestInit) => { status?: number; body: unknown };

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
let token = 0;

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = "id";
  process.env.GOOGLE_CLIENT_SECRET = "secret";
  calls = [];
  token++;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes("oauth2.googleapis.com/token")) return json(200, { access_token: `at-${token}`, expires_in: 3600 });
      const r = handler(url, init);
      return json(r.status ?? 200, r.body);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const mail = { from: "Ali <ali@firma.com>", to: "ayse@lale.com", subject: "Merhaba", text: "Selam", messageId: "<mine@firma.com>", bcc: ["gizli@firma.com"] };

describe("Gmail API", () => {
  it("yapılandırma değişkenleri varsa hazır sayılır", () => {
    expect(googleConfigured()).toBe(true);
    delete process.env.GOOGLE_CLIENT_ID;
    expect(googleConfigured()).toBe(false);
  });

  it("ham ileti gönderir (Bcc başlığıyla) ve Gmail'in verdiği gerçek Message-ID'yi döndürür", async () => {
    handler = (url) => (url.endsWith("/messages/send") ? { body: { id: "m1" } } : { body: { payload: { headers: [{ name: "Message-ID", value: "<gmail-real@mail.gmail.com>" }] } } });
    const r = await sendViaGmail(`refresh-${token}`, mail);
    expect(r.messageId).toBe("<gmail-real@mail.gmail.com>");
    const send = calls.find((c) => c.url.endsWith("/messages/send"))!;
    expect((send.init!.headers as Record<string, string>).Authorization).toBe(`Bearer at-${token}`);
    const raw = Buffer.from(JSON.parse(send.init!.body as string).raw, "base64url").toString("utf8");
    expect(raw).toMatch(/^Message-ID: <mine@firma.com>/im);
    expect(raw).toMatch(/^To: ayse@lale.com/im);
    expect(raw).toMatch(/^Bcc: gizli@firma.com/im);
    expect(raw).toContain("Selam");
  });

  it("Message-ID okunamazsa kendi kimliğimizi kullanır", async () => {
    handler = (url) => (url.endsWith("/messages/send") ? { body: { id: "m1" } } : { status: 500, body: {} });
    expect((await sendViaGmail(`refresh-${token}`, mail)).messageId).toBe("<mine@firma.com>");
  });

  it("yetki hatalarını SMTP sınıflandırmasıyla uyumlu (kimlik) bildirir", async () => {
    handler = () => ({ status: 401, body: { error: { message: "Invalid Credentials" } } });
    const err = await sendViaGmail(`refresh-${token}`, mail).catch((e) => e);
    expect(err).toBeInstanceOf(GmailApiError);
    expect(classifySmtpFailure(err)).toBe("kimlik");
  });

  it("geçersiz alıcıyı kalıcı red olarak sınıflar", async () => {
    handler = () => ({ status: 400, body: { error: { message: "Invalid To header" } } });
    const err = await sendViaGmail(`refresh-${token}`, mail).catch((e) => e);
    expect(classifySmtpFailure(err)).toBe("alici_yok");
  });

  it("iptal edilmiş yenileme jetonunu (invalid_grant) kimlik hatası sayar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(400, { error: "invalid_grant" })));
    const err = await sendViaGmail(`revoked-${token}`, mail).catch((e) => e);
    expect(classifySmtpFailure(err)).toBe("kimlik");
    expect(err.message).toContain("yeniden bağlayın");
  });

  it("gelen kutusuna düşen yeni iletileri geçmişten toplar; eski geçmiş kimliğinde null döner", async () => {
    handler = () => ({
      body: {
        historyId: "200",
        history: [
          { messagesAdded: [{ message: { id: "a", labelIds: ["INBOX"] } }, { message: { id: "b", labelIds: ["SENT"] } }] },
          { messagesAdded: [{ message: { id: "c", labelIds: ["INBOX", "UNREAD"] } }] },
        ],
      },
    });
    expect(await newInboxMessageIds(`refresh-${token}`, "100")).toEqual({ ids: ["a", "c"], historyId: "200" });

    handler = () => ({ status: 404, body: { error: { message: "Requested entity was not found." } } });
    expect(await newInboxMessageIds(`refresh-${token}`, "1")).toBeNull();
  });

  it("ham iletiyi çözer", async () => {
    handler = () => ({ body: { id: "a", raw: Buffer.from("Subject: x\r\n\r\nmerhaba").toString("base64url"), sizeEstimate: 20 } });
    const m = await getRaw(`refresh-${token}`, "a");
    expect(m?.raw.toString()).toContain("merhaba");
  });
});

describe("deliver", () => {
  it("Google gönderici adresini Gmail API ile gönderir (SMTP'ye gitmez)", async () => {
    handler = (url) => (url.endsWith("/messages/send") ? { body: { id: "m9" } } : { body: { payload: { headers: [{ name: "Message-ID", value: "<z@x>" }] } } });
    const r = await deliver({ provider: "google", smtp: { host: "smtp.gmail.com", port: 465, secure: true }, username: "a@b.com" }, `refresh-${token}`, mail);
    expect(r.messageId).toBe("<z@x>");
    expect(calls.some((c) => c.url.includes("gmail.googleapis.com"))).toBe(true);
  });
});
