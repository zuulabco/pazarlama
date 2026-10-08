import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { site } from "@/lib/site";
import { signToken } from "@/modules/outreach/crypto";
import { GMAIL_SCOPES, GoogleConfigError, googleClient } from "@/modules/outreach/gmail";
import { guard } from "@/modules/outreach/http";

const back = (reason: string) => NextResponse.redirect(new URL(`/panel/posta-kutulari?google=hata&neden=${reason}`, site.url));

/** "Google ile bağlan": kullanıcıyı Google'ın izin ekranına yönlendirir. Durum jetonu hem imzalı hem de tarayıcıya çerezle bağlıdır. */
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if ("response" in g) return NextResponse.redirect(new URL("/giris", site.url));

  let clientId: string;
  try {
    clientId = googleClient().id;
  } catch (e) {
    if (e instanceof GoogleConfigError) return back("yapilandirma");
    throw e;
  }

  const nonce = randomBytes(16).toString("base64url");
  const state = signToken(`gs:${g.user.uid}:${nonce}:${Date.now() + 10 * 60_000}`);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${site.url}/api/outreach/oauth/google/callback`,
    response_type: "code",
    scope: GMAIL_SCOPES.join(" "),
    access_type: "offline",
    // Yenileme jetonunun her bağlamada verilmesi için onay ekranı her seferinde gösterilir.
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  }).toString();

  const res = NextResponse.redirect(url);
  res.cookies.set("adspine_gstate", nonce, { httpOnly: true, sameSite: "lax", secure: site.url.startsWith("https:"), path: "/api/outreach/oauth", maxAge: 600 });
  return res;
}
