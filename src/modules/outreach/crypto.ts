import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Gönderici adresi şifreleri ve imzalı jetonlar için şifreleme yardımcıları.
 * Anahtar: OUTREACH_ENC_KEY (base64, 32 bayt). Üretmek için: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
 */

export class CryptoConfigError extends Error {
  constructor() {
    super("OUTREACH_ENC_KEY tanımlı değil ya da 32 bayt (base64) değil.");
  }
}

function key(): Buffer {
  const raw = process.env.OUTREACH_ENC_KEY ?? "";
  const k = Buffer.from(raw.replace(/^"|"$/g, ""), "base64");
  if (k.length !== 32) throw new CryptoConfigError();
  return k;
}

/** AES-256-GCM: çıktı "v1.<iv>.<etiket>.<şifreli>" (base64url). Her çağrıda yeni rastgele IV kullanılır. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptSecret(token: string): string {
  const [v, iv, tag, data] = token.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Geçersiz şifreli veri.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

/** Abonelik ve izleme bağlantıları için HMAC imzalı, kurcalanamaz jeton: "<yük>.<imza>". */
export function signToken(payload: string): string {
  const body = Buffer.from(payload, "utf8").toString("base64url");
  return `${body}.${createHmac("sha256", key()).update(body).digest("base64url")}`;
}

const UUID_HEX = /^[0-9a-f]{32}$/;

/**
 * Abonelik bağlantıları için KISA jeton: 16 bayt kayıt kimliği + 9 bayt HMAC = 34 karakter (eski jeton ~95 karakterdi).
 * E-postada görünen bağlantının kısa ve güvenilir durması için; imza kısaltılmıştır ama hâlâ tahmin edilemez.
 */
export function shortEnrollmentToken(enrollmentId: string): string {
  const hex = enrollmentId.replace(/-/g, "").toLowerCase();
  if (!UUID_HEX.test(hex)) throw new Error("Geçersiz kayıt kimliği.");
  const raw = Buffer.from(hex, "hex");
  const tag = createHmac("sha256", key()).update("u:").update(raw).digest().subarray(0, 9);
  return Buffer.concat([raw, tag]).toString("base64url");
}

/** Kısa jetonu doğrular; geçerliyse kayıt kimliğini (UUID) döndürür. */
export function verifyShortEnrollmentToken(token: string): string | null {
  if (!/^[A-Za-z0-9_-]{34}$/.test(token)) return null;
  const buf = Buffer.from(token, "base64url");
  if (buf.length !== 25) return null;
  const raw = buf.subarray(0, 16);
  const expected = createHmac("sha256", key()).update("u:").update(raw).digest().subarray(0, 9);
  if (!timingSafeEqual(buf.subarray(16), expected)) return null;
  const h = raw.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function verifyToken(token: string): string | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", key()).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return Buffer.from(body, "base64url").toString("utf8");
}
