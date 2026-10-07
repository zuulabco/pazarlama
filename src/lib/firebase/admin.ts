import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function readPrivateKey() {
  const raw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!raw) throw new Error("FIREBASE_ADMIN_PRIVATE_KEY tanımlı değil");
  // Hem gerçek satır sonlarını hem de "\n" kaçışlı tek satırı, tırnaklı ya da tırnaksız kabul et.
  return raw.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
}

function adminApp(): App {
  return (
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: readPrivateKey(),
      }),
    })
  );
}

export function adminAuth() {
  return getAuth(adminApp());
}
