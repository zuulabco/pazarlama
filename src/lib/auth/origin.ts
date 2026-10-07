import type { NextRequest } from "next/server";

/** Durum değiştiren isteklerin yalnızca kendi sitemizden gelmesini sağlar (CSRF savunması). */
export function isSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  return origin !== null && origin === req.nextUrl.origin;
}
