import { simpleParser, type ParsedMail } from "mailparser";
import { SMTPServer } from "smtp-server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// Gerçek DNS çözümü ve genel-IP denetimi yerine yerel yem sunucusuna bağlan (SSRF denetimi hosts.test'te ayrıca sınanır).
vi.mock("./hosts", () => ({ resolvePublicHost: async () => "127.0.0.1", HostBlockedError: class extends Error {} }));

const { sendMail, verifySmtp } = await import("./smtp");
const { buildOutgoing, newMessageId, threadSubject } = await import("./mime");

let server: SMTPServer;
let port = 0;
const received: ParsedMail[] = [];

beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true,
    disabledCommands: ["STARTTLS"],
    onAuth: (auth, _s, cb) => (auth.username === "elif@firma.com" && auth.password === "dogru" ? cb(null, { user: auth.username }) : cb(new Error("Invalid login"))),
    onRcptTo: (addr, _s, cb) => (addr.address === "yok@lale.com" ? cb(Object.assign(new Error("550 5.1.1 The email account that you tried to reach does not exist"), { responseCode: 550 })) : cb()),
    onData: (stream, _s, cb) => {
      simpleParser(stream).then((m) => {
        received.push(m);
        cb();
      }, cb);
    },
  });
  await new Promise<void>((res) => server.listen(0, "127.0.0.1", res));
  port = (server.server.address() as { port: number }).port;
});

afterAll(() => new Promise<void>((res) => server.close(() => res())));

const cfg = () => ({ host: "smtp.firma.com", port: port, secure: false, user: "elif@firma.com", pass: "dogru" });
const base = {
  fromName: "Elif Yıldız",
  fromEmail: "elif@firma.com",
  to: "ayse@lale.com",
  subject: "Kısa bir soru",
  body: "Merhaba Ayşe,\n\nKısa bir sorum var; uygun musunuz?",
  signature: "Elif\nYıldız MM",
  includeSignature: true,
  identity: "Elif Yıldız · Yıldız Mali Müşavirlik",
  unsubscribeUrl: "https://adspine.app/u/T",
  oneClickUrl: "https://adspine.app/api/outreach/unsub/T",
};

describe("SMTP gönderimi (yerel yem sunucusu)", () => {
  it("giriş bilgilerini sınar", async () => {
    await expect(verifySmtp(cfg())).resolves.toBeUndefined();
    await expect(verifySmtp({ ...cfg(), pass: "yanlis" })).rejects.toMatchObject({ code: "EAUTH" });
  });

  it("ilk e-postayı ve aynı konuşmadaki takibi doğru başlıklarla gönderir", async () => {
    const id1 = newMessageId("firma.com");
    await sendMail(cfg(), buildOutgoing({ ...base, messageId: id1 }));

    const id2 = newMessageId("firma.com");
    await sendMail(cfg(), buildOutgoing({ ...base, subject: threadSubject("", true, base.subject), body: "Merhaba Ayşe,\n\nKısaca geri dönüyorum.", messageId: id2, inReplyTo: id1, references: [id1] }));

    const [first, second] = received.slice(-2);
    expect(first.from?.value[0]).toMatchObject({ name: "Elif Yıldız", address: "elif@firma.com" });
    expect(first.messageId).toBe(id1);
    expect(first.subject).toBe("Kısa bir soru");
    expect(first.text).toContain("Kısa bir sorum var");
    expect(first.text).toContain("Elif\nYıldız MM");
    expect(first.text).toContain("abonelikten çıkabilirsiniz: https://adspine.app/u/T");
    // mailparser bu iki başlığı özel alanlara çevirir; ham satırlar denetlenir.
    const raw = (key: string) => first.headerLines.find((h) => h.key === key)?.line;
    expect(raw("list-unsubscribe")).toContain("<https://adspine.app/api/outreach/unsub/T>");
    expect(raw("list-unsubscribe-post")).toContain("List-Unsubscribe=One-Click");

    expect(second.subject).toBe("Re: Kısa bir soru");
    expect(second.inReplyTo).toBe(id1);
    expect([second.references].flat()).toEqual([id1]);
  });

  it("var olmayan alıcıyı kalıcı red olarak bildirir", async () => {
    await expect(sendMail(cfg(), buildOutgoing({ ...base, to: "yok@lale.com", messageId: newMessageId("firma.com") }))).rejects.toMatchObject({ responseCode: 550 });
  });
});
