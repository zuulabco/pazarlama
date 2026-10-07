import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/auth/constants";
import { isSameOrigin } from "@/lib/auth/origin";
import { adminAuth } from "@/lib/firebase/admin";

/** Session cookie yalnızca yeni yapılmış bir girişten üretilir. */
const MAX_SIGN_IN_AGE_S = 5 * 60;

const bodySchema = z.object({ idToken: z.string().min(1) });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Eksik giriş bilgisi." }, { status: 400 });
  }

  try {
    const decoded = await adminAuth().verifyIdToken(parsed.data.idToken);
    if (Date.now() / 1000 - decoded.auth_time > MAX_SIGN_IN_AGE_S) {
      return NextResponse.json({ error: "Giriş süresi doldu, tekrar giriş yapın." }, { status: 401 });
    }

    const sessionCookie = await adminAuth().createSessionCookie(parsed.data.idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    (await cookies()).set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Oturum açılamadı, tekrar deneyin." }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
  }

  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  store.delete(SESSION_COOKIE);

  if (value) {
    // Diğer cihazlardaki oturumları da sonlandır; cookie zaten geçersizse sessizce geç.
    await adminAuth()
      .verifySessionCookie(value)
      .then((t) => adminAuth().revokeRefreshTokens(t.uid))
      .catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
