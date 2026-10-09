"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  type User,
} from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { nextPath, startSession } from "@/lib/auth/client-session";
import { clientAuth } from "@/lib/firebase/client";
import { authErrorMessage } from "./auth-errors";

type Mode = "giris" | "kayit";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [pending, setPending] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "email" | "google", action: () => Promise<User>) {
    setPending(kind);
    setError(null);
    try {
      const user = await action();
      const onboarded = await startSession(user);
      // Kurulumu bitirmemiş kullanıcı panele uğramadan doğrudan kuruluma gider (panel bir an görünmesin).
      router.replace(onboarded ? nextPath() : "/onboarding");
      router.refresh();
    } catch (e) {
      setError(authErrorMessage(e));
      setPending(null);
    }
  }

  function onGoogle() {
    run("google", async () => (await signInWithPopup(clientAuth(), new GoogleAuthProvider())).user);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    const name = String(form.get("name") ?? "").trim();

    if (mode === "kayit" && password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }

    run("email", async () => {
      const auth = clientAuth();
      if (mode === "giris") return (await signInWithEmailAndPassword(auth, email, password)).user;

      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name });
      // Doğrulama e-postası arka planda gider; kaydı bekletmez.
      sendEmailVerification(user).catch(() => undefined);
      // Görünen adın session cookie'ye yansıması için token yenilenir.
      await user.getIdToken(true);
      return user;
    });
  }

  const busy = pending !== null;

  return (
    <div className="grid gap-6">
      <Button variant="secondary" size="lg" onClick={onGoogle} disabled={busy}>
        <GoogleMark />
        {pending === "google" ? "Google açılıyor…" : "Google ile devam et"}
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted" role="separator">
        <span className="h-px flex-1 bg-line" />
        veya e-posta ile
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={onSubmit} className="grid gap-4">
        {mode === "kayit" && <Field label="Ad soyad" name="name" autoComplete="name" required />}
        <Field label="E-posta" name="email" type="email" autoComplete="email" required />
        <Field
          label="Şifre"
          name="password"
          type="password"
          autoComplete={mode === "kayit" ? "new-password" : "current-password"}
          minLength={mode === "kayit" ? 8 : undefined}
          hint={mode === "kayit" ? "En az 8 karakter." : undefined}
          required
        />

        {mode === "giris" && (
          <Link href="/sifremi-unuttum" className="-mt-1 justify-self-start text-sm text-accent hover:underline">
            Şifremi unuttum
          </Link>
        )}

        {error && (
          <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={busy}>
          {pending === "email"
            ? mode === "giris"
              ? "Giriş yapılıyor…"
              : "Hesap oluşturuluyor…"
            : mode === "giris"
              ? "Giriş yap"
              : "Hesap oluştur"}
        </Button>
      </form>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8l4-3Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  );
}
