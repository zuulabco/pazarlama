"use client";

import { sendPasswordResetEmail } from "firebase/auth";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { clientAuth } from "@/lib/firebase/client";
import { authErrorMessage } from "../_components/auth-errors";

export function ResetForm() {
  const [state, setState] = useState<"idle" | "pending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    setState("pending");
    setError(null);
    try {
      await sendPasswordResetEmail(clientAuth(), email);
      setState("sent");
    } catch (err) {
      // Hesabın var olup olmadığını açığa çıkarmamak için "kullanıcı yok" da başarı gibi gösterilir.
      if ((err as { code?: string }).code === "auth/user-not-found") return setState("sent");
      setError(authErrorMessage(err));
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <p role="status" className="rounded-control bg-forest-soft px-4 py-3 text-accent">
        Bu adrese kayıtlı bir hesap varsa sıfırlama bağlantısı gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="E-posta" name="email" type="email" autoComplete="email" required />
      {error && (
        <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={state === "pending"}>
        {state === "pending" ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}
      </Button>
    </form>
  );
}
