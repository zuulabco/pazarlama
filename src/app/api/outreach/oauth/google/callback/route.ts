import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { site } from "@/lib/site";
import { verifyToken } from "@/modules/outreach/crypto";
import { checkDomain } from "@/modules/outreach/dns-lookup";
import { exchangeCode, GMAIL_SCOPES, getProfile, GmailApiError } from "@/modules/outreach/gmail";
import { guard } from "@/modules/outreach/http";
import { connectGoogleMailbox } from "@/modules/outreach/mailboxes";

const back = (ok: boolean, extra: Record<string, string> = {}) => {
  const res = NextResponse.redirect(new URL(`/panel/posta-kutulari?${new URLSearchParams({ google: ok ? "ok" : "hata", ...extra })}`, site.url));
  res.cookies.set("adspine_gstate", "", { path: "/api/outreach/oauth", maxAge: 0 });
  return res;
};

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Google'ın dönüş adresi: durumu doğrular, kodu jetonlarla değiştirir, posta kutusunu bağlar. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  if (q.get("error")) return back(false, { neden: q.get("error") === "access_denied" ? "reddedildi" : "google" });

  const g = await guard(req);
  if ("response" in g) return NextResponse.redirect(new URL("/giris", site.url));

  // state = gs:<uid>:<nonce>:<bitiş>; imza, süre, kullanıcı ve tarayıcı çerezi birlikte eşleşmeli.
  const payload = verifyToken(q.get("state") ?? "");
  const [tag, uid, nonce, exp] = (payload ?? "").split(":");
  const cookie = req.cookies.get("adspine_gstate")?.value ?? "";
  if (tag !== "gs" || uid !== g.user.uid || !nonce || !cookie || !same(nonce, cookie) || Number(exp) < Date.now()) return back(false, { neden: "oturum" });

  const code = q.get("code");
  if (!code) return back(false, { neden: "google" });

  try {
    const tokens = await exchangeCode(code, `${site.url}/api/outreach/oauth/google/callback`);
    const granted = (tokens.scope ?? "").split(" ");
    // Ayrıntılı izin ekranında kullanıcı kutucukları kaldırabilir; ikisi de gerekli.
    if (!GMAIL_SCOPES.every((s) => granted.includes(s))) return back(false, { neden: "izin" });
    if (!tokens.refresh_token) return back(false, { neden: "google" });

    const profile = await getProfile(tokens.refresh_token);
    const dns = await checkDomain(profile.emailAddress.slice(profile.emailAddress.lastIndexOf("@") + 1), "google").catch(() => null);
    const mailbox = await connectGoogleMailbox(g.user.uid, { email: profile.emailAddress, fromName: g.user.name ?? null, refreshToken: tokens.refresh_token, historyId: profile.historyId, dns });
    return back(true, { email: mailbox.email });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("En fazla")) return back(false, { neden: "limit" });
    if (!(e instanceof GmailApiError)) console.error("Google bağlantısı başarısız:", e);
    return back(false, { neden: "google" });
  }
}
