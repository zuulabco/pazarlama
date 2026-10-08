import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin } from "@/lib/auth/origin";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { DuplicateContactError, OutreachUnavailableError } from "./contacts";
import { CryptoConfigError } from "./crypto";
import { DuplicateMailboxError } from "./mailboxes";

/** Otomasyon API'lerinin ortak yardımcıları. Route dosyaları yalnızca HTTP işleyicilerini dışa aktarabildiği için burada. */

export const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status });

/** Oturumu (ve durum değiştiren isteklerde aynı-kaynak denetimini) doğrular. Başarısızsa hazır yanıtı döndürür. */
export async function guard(req: NextRequest, opts: { write?: boolean } = {}): Promise<{ user: SessionUser } | { response: NextResponse }> {
  if (opts.write && !isSameOrigin(req)) return { response: fail("Geçersiz istek kaynağı.", 403) };
  const user = await getSessionUser();
  if (!user) return { response: fail("Oturumunuz sona erdi. Tekrar giriş yapın.", 401) };
  return { user };
}

export function outreachFailure(e: unknown) {
  if (e instanceof OutreachUnavailableError) return fail("Otomasyon henüz etkinleştirilmedi. Kısa süre sonra tekrar deneyin.", 503);
  if (e instanceof DuplicateContactError || e instanceof DuplicateMailboxError) return fail(e.message, 409);
  if (e instanceof CryptoConfigError) return fail("Gönderici adresi şifreleme anahtarı (OUTREACH_ENC_KEY) sunucuda tanımlı değil.", 503);
  if (e instanceof Error && e.message.startsWith("En fazla")) return fail(e.message, 409);
  console.error("Otomasyon işlemi başarısız:", e);
  return fail("İşlem tamamlanamadı. Tekrar deneyin.", 500);
}

/** Kullanıcı başına dakikada en çok `max` istek (sunucu örneği başına ilk savunma). */
export function rateLimiter(max: number, windowMs = 60_000) {
  const recent = new Map<string, number[]>();
  return (uid: string) => {
    const now = Date.now();
    const hits = (recent.get(uid) ?? []).filter((t) => now - t < windowMs);
    hits.push(now);
    recent.set(uid, hits);
    if (recent.size > 500) for (const [k, v] of recent) if (v.every((t) => now - t >= windowMs)) recent.delete(k);
    return hits.length > max;
  };
}
