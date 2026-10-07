import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * İyimser kontrol: yalnızca session cookie'nin varlığına bakar.
 * Asıl doğrulama sunucu tarafında requireUser() ile yapılır.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = new URL("/giris", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/panel/:path*", "/onboarding/:path*"],
};
