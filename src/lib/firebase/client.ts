import { getApp, getApps, initializeApp } from "firebase/app";
import { browserPopupRedirectResolver, inMemoryPersistence, initializeAuth, type Auth } from "firebase/auth";

let auth: Auth | undefined;

/**
 * Oturumun tek kaynağı sunucudaki httpOnly cookie olduğu için Firebase istemci
 * durumu tarayıcıda saklanmaz (inMemoryPersistence). Sadece giriş anında ID token
 * almak için kullanılır.
 */
export function clientAuth(): Auth {
  if (auth) return auth;
  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
  auth = initializeAuth(app, {
    persistence: inMemoryPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
  auth.languageCode = "tr";
  return auth;
}
