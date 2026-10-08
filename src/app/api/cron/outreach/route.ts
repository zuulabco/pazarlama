import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runBounceGuard } from "@/modules/outreach/guard";
import { purgeOldBrowses } from "@/modules/outreach/lead-browse";
import { finalizeOpenLeadJobs } from "@/modules/outreach/lead-search";
import { runSendTick } from "@/modules/outreach/sender";
import { scanDueMailboxes } from "@/modules/outreach/scan";

export const maxDuration = 300;

function authorized(req: NextRequest): boolean | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;
  const given = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Zamanlayıcı uç noktası: her çağrıda (1) vadesi gelen kampanya e-postalarını gönderir, (2) gönderici adreslerinin gelen kutusunu
 * yanıt/bounce için tarar, (3) Bounce Guard'ı çalıştırır, (4) biten "Kişi bul" aramalarını aktarır. `Authorization: Bearer CRON_SECRET` ister (Vercel Cron bunu kendisi ekler;
 * GitHub Actions/pg_cron ile de çağrılabilir). Oturum çerezi kullanılmaz.
 */
async function run(req: NextRequest) {
  const ok = authorized(req);
  if (ok === null) return NextResponse.json({ error: "CRON_SECRET tanımlı değil." }, { status: 503 });
  if (!ok) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const started = Date.now();
  try {
    const send = await runSendTick({ batch: 20, deadlineMs: 150_000 });
    const scan = await scanDueMailboxes(3, Math.max(20_000, 250_000 - (Date.now() - started)));
    const paused = await runBounceGuard();
    // Kişi bul: tarayıcı kapalıyken biten aramaların sonuçlarını aktarır (sağlayıcı yapılandırılmamışsa sessizce atlanır).
    const leadJobs = await finalizeOpenLeadJobs().catch((e) => {
      console.error("Kişi bul işleri kapatılamadı:", e instanceof Error ? e.message : e);
      return 0;
    });
    await purgeOldBrowses().catch(() => undefined);
    return NextResponse.json({ ok: true, ms: Date.now() - started, send, scan, paused, leadJobs });
  } catch (e) {
    console.error("Cron hatası:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Hata" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
