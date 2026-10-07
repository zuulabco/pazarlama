import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "../_components/auth-form";

export const metadata: Metadata = { title: "Giriş yap" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Tekrar hoş geldiniz</h1>
      <p className="mt-2 mb-8 text-muted">Kaldığınız listeden devam edin.</p>
      <AuthForm mode="giris" />
      <p className="mt-8 text-sm text-muted">
        Hesabınız yok mu?{" "}
        <Link href="/kayit" className="font-medium text-forest hover:underline">
          Hesap oluşturun
        </Link>
      </p>
    </>
  );
}
