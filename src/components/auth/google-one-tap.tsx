"use client";

import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { nextPath, startSession } from "@/lib/auth/client-session";
import { clientAuth } from "@/lib/firebase/client";

type Credential = { credential?: string };
type GoogleId = {
  initialize: (cfg: { client_id: string; callback: (r: Credential) => void; auto_select?: boolean; cancel_on_tap_outside?: boolean; context?: string; itp_support?: boolean }) => void;
  prompt: () => void;
  cancel: () => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const SRC = "https://accounts.google.com/gsi/client";

/**
 * Google ile tek dokunuşla giriş (One Tap): giriş yapmamış ziyaretçiye sağ üst köşede küçük bir "Google ile devam et" kutusu açılır;
 * tıklayınca Google kimlik jetonu Firebase'e verilir ve oturum açılır. Ortam değişkeni NEXT_PUBLIC_GOOGLE_CLIENT_ID (Firebase projesinin
 * "Web client ID"si) tanımlı değilse hiçbir şey yapmaz. Kullanıcı kutuyu kapatırsa Google bir süre tekrar göstermez.
 */
export function GoogleOneTap() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || started.current) return;
    started.current = true;

    async function onCredential(r: Credential) {
      if (!r.credential) return;
      try {
        const { user } = await signInWithCredential(clientAuth(), GoogleAuthProvider.credential(r.credential));
        const onboarded = await startSession(user);
        router.replace(onboarded ? nextPath() : "/onboarding");
        router.refresh();
      } catch (e) {
        console.error("Google ile giriş yapılamadı:", e instanceof Error ? e.message : e);
      }
    }

    function init() {
      const id = window.google?.accounts.id;
      if (!id) return;
      id.initialize({ client_id: clientId!, callback: (r) => void onCredential(r), cancel_on_tap_outside: false, context: "signin", itp_support: true });
      id.prompt();
    }

    if (window.google?.accounts.id) {
      init();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
      const script = existing ?? Object.assign(document.createElement("script"), { src: SRC, async: true, defer: true });
      script.addEventListener("load", init, { once: true });
      if (!existing) document.head.appendChild(script);
    }
    return () => window.google?.accounts.id.cancel();
  }, [router]);

  return null;
}
