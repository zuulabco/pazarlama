import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isLikelyBusinessType } from "@/modules/leads/jev";

/**
 * Yazılan firma türü gerçek bir işletme türü mü? Arama formu, kullanıcı yazarken bunu sorar;
 * böylece geçersiz ifade aramaya hiç girmeden uyarılır. (JEV ile yaklaşık 0,3 sn.)
 */
export async function GET(req: NextRequest) {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Oturumunuz sona erdi." }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 60) return NextResponse.json({ valid: false });

  const valid = await isLikelyBusinessType(q);
  // Aynı ifade tekrar yazılırsa tarayıcı önbelleği yanıtlar.
  return NextResponse.json({ valid }, { headers: { "Cache-Control": "private, max-age=86400" } });
}
