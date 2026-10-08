import "server-only";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { pipeline, Writable } from "node:stream";
import zlib from "node:zlib";
import { isPrivateIp } from "./ip";

/**
 * Kullanıcının verdiği adresi güvenle okur (SSRF'e karşı): yalnızca internetten erişilebilir adreslere,
 * yalnızca 80/443 portlarına bağlanır. Adres, bağlantı anında çözülen IP üzerinden denetlenir (DNS
 * rebinding'e karşı); yönlendirmeler tek tek yeniden denetlenir. Boyut ve süre sınırlıdır.
 */

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 9_000;

export class UnreachableSiteError extends Error {}

type LookupCallback = (err: Error | null, address: string | dns.LookupAddress[], family?: number) => void;

/** Yalnızca genel IP'lere çözülen adreslerle bağlanılmasına izin veren çözümleyici. */
const publicLookup = ((hostname: string, options: dns.LookupOptions, callback: LookupCallback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "");
    const allowed = addresses.filter((a) => !isPrivateIp(a.address));
    if (allowed.length === 0) return callback(new UnreachableSiteError("Adres genel bir sunucuya çözülmüyor."), "");
    if (options.all) return callback(null, allowed);
    callback(null, allowed[0].address, allowed[0].family);
  });
}) as unknown as LookupFunction;

type Raw = { status: number; headers: http.IncomingHttpHeaders; body: Buffer };

/** Sertifika zinciri doğrulanamadığında (Türkiye'deki birçok sitede ara sertifika eksiktir) görülen hata kodları. */
const CERT_ERRORS = new Set([
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "CERT_HAS_EXPIRED",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

function request(url: URL, insecure = false): Promise<Raw> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(
      url,
      {
        method: "GET",
        lookup: publicLookup,
        // Yalnızca herkese açık sayfa okunur (kimlik bilgisi gönderilmez); bu yüzden sertifika zinciri eksik siteler için
        // ikinci denemede doğrulama kapatılır. Adres kısıtları (genel IP, 80/443) bu durumda da geçerlidir.
        ...(insecure ? { rejectUnauthorized: false } : {}),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; AdspineBot/1.0; +https://adspine.app)",
          accept: "text/html,application/xhtml+xml",
          "accept-language": "tr,en;q=0.8",
          "accept-encoding": "gzip, deflate, br",
        },
      },
      (res) => {
        const encoding = String(res.headers["content-encoding"] ?? "").toLowerCase();
        const decoder =
          encoding === "gzip" ? zlib.createGunzip() : encoding === "br" ? zlib.createBrotliDecompress() : encoding === "deflate" ? zlib.createInflate() : null;
        const chunks: Buffer[] = [];
        let size = 0;
        const sink = new Writable({
          write(chunk: Buffer, _enc, done) {
            size += chunk.length;
            chunks.push(chunk);
            // Sınıra ulaşınca okuma bırakılır; o ana kadarki kısım yeterlidir.
            if (size > MAX_BYTES) {
              res.destroy();
              return done(new Error("limit"));
            }
            done();
          },
        });
        const finish = () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).subarray(0, MAX_BYTES) });
        const onDone = (e?: Error | null) => (e && e.message !== "limit" && size === 0 ? reject(e) : finish());
        if (decoder) pipeline(res, decoder, sink, onDone);
        else pipeline(res, sink, onDone);
      },
    );
    req.on("error", reject);
    req.end();
  });
}

function assertAllowed(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new UnreachableSiteError("Yalnızca http(s) adresleri okunur.");
  if (url.username || url.password) throw new UnreachableSiteError("Kimlik bilgisi içeren adres okunmaz.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new UnreachableSiteError("Bu port okunmaz.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  // IP yazılmışsa çözümleyici hiç çağrılmaz; burada elle denetlenir.
  if (isIP(host) !== 0 && isPrivateIp(host)) throw new UnreachableSiteError("Bu adrese bağlanılmaz.");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new UnreachableSiteError("Bu adrese bağlanılmaz.");
  }
}

function decode(body: Buffer, contentType: string): string {
  const declared = /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ?? /<meta[^>]+charset=["']?([\w-]+)/i.exec(body.subarray(0, 2048).toString("latin1"))?.[1];
  try {
    return new TextDecoder(declared ?? "utf-8").decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}

/** Adresteki HTML sayfayı okur. Ulaşılamazsa ya da HTML değilse UnreachableSiteError fırlatır. */
export async function fetchPublicHtml(start: string): Promise<{ url: string; html: string }> {
  let url = new URL(start);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertAllowed(url);
    let res: Raw;
    try {
      try {
        res = await request(url);
      } catch (e) {
        if (url.protocol === "https:" && CERT_ERRORS.has((e as NodeJS.ErrnoException).code ?? "")) res = await request(url, true);
        else throw e;
      }
    } catch (e) {
      throw e instanceof UnreachableSiteError ? e : new UnreachableSiteError("Siteye ulaşılamadı.");
    }
    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      try {
        url = new URL(res.headers.location, url);
      } catch {
        throw new UnreachableSiteError("Geçersiz yönlendirme.");
      }
      continue;
    }
    const type = String(res.headers["content-type"] ?? "");
    if (res.status >= 400 || !/html/i.test(type)) throw new UnreachableSiteError("Sayfa okunamadı.");
    return { url: url.toString(), html: decode(res.body, type) };
  }
  throw new UnreachableSiteError("Çok fazla yönlendirme.");
}
