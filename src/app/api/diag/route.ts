// GEÇİCİ teşhis endpoint'i: canlıdaki 500'ün sebebini bulmak için. Bulunca silinecek.
import { connection, NextResponse } from "next/server";

async function step(name: string, fn: () => Promise<unknown>) {
  try {
    const info = await fn();
    return { name, ok: true, info: info === undefined ? null : info };
  } catch (e) {
    const err = e as { name?: string; code?: string; message?: string };
    return { name, ok: false, error: `${err.name ?? ""} ${err.code ?? ""} ${(err.message ?? "").slice(0, 160)}`.trim() };
  }
}

export async function GET() {
  await connection(); // istek anında çalışsın, derleme sırasında değil

  const raw = process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "";
  const key = raw.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  const steps = [
    await step("env", async () => ({
      node: process.version,
      projectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      keyLen: raw.length,
      keyHasRealNewlines: raw.includes("\n"),
      keyHasEscapedNewlines: raw.includes("\\n"),
      keyStartsOk: key.startsWith("-----BEGIN PRIVATE KEY-----"),
      keyEndsOk: key.trimEnd().endsWith("-----END PRIVATE KEY-----"),
    })),
    await step("import server-only", async () => void (await import("server-only"))),
    await step("import firebase-admin/app", async () => void (await import("firebase-admin/app"))),
    await step("import firebase-admin/auth", async () => void (await import("firebase-admin/auth"))),
    await step("import lib/firebase/admin", async () => void (await import("@/lib/firebase/admin"))),
    await step("import zod", async () => void (await import("zod"))),
    await step("verifyIdToken(x)", async () => {
      const { adminAuth } = await import("@/lib/firebase/admin");
      await adminAuth().verifyIdToken("x");
    }),
  ];
  return NextResponse.json(steps);
}
