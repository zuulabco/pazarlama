import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { detectProvider } from "@/modules/outreach/dns-lookup";
import { fail, guard } from "@/modules/outreach/http";
import { guessProvider, presetFor } from "@/modules/outreach/presets";

const emailSchema = z.string().trim().toLowerCase().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/);

/** E-posta adresinden sağlayıcıyı (Google/Microsoft/diğer) ve sunucu ön ayarlarını bulur. Özel alan adlarında MX'e bakar. */
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if ("response" in g) return g.response;
  const email = emailSchema.safeParse(req.nextUrl.searchParams.get("email"));
  if (!email.success) return fail("Geçerli bir e-posta adresi yazın.", 400);

  const domain = email.data.slice(email.data.lastIndexOf("@") + 1);
  const provider = guessProvider(email.data) ?? (await detectProvider(domain)) ?? "ozel";
  return NextResponse.json({ provider, ...presetFor(provider, email.data) });
}
