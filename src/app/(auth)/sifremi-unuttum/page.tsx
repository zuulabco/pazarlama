import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Şifremi unuttum" };

export default function ResetPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Şifrenizi sıfırlayın</h1>
      <p className="mt-2 mb-8 text-muted">E-posta adresinizi girin, sıfırlama bağlantısını gönderelim.</p>
      <ResetForm />
      <p className="mt-8 text-sm text-muted">
        <Link href="/giris" className="font-medium text-forest hover:underline">
          Giriş sayfasına dön
        </Link>
      </p>
    </>
  );
}
