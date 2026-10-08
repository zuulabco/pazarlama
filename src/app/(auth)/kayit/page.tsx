import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "../_components/auth-form";

export const metadata: Metadata = { title: "Hesap oluştur" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Hesabınızı oluşturun</h1>
      <p className="mt-2 mb-8 text-muted">Ardından hedefinizi birkaç adımda anlatacaksınız.</p>
      <AuthForm mode="kayit" />
      <p className="mt-6 text-xs text-muted">
        Hesap oluşturarak kişisel verilerinizin{" "}
        <Link href="/gizlilik" className="underline hover:text-ink">
          Gizlilik ve KVKK Aydınlatma Metni
        </Link>{" "}
        kapsamında işleneceğini kabul etmiş olursunuz.
      </p>
      <p className="mt-6 text-sm text-muted">
        Zaten hesabınız var mı?{" "}
        <Link href="/giris" className="font-medium text-accent hover:underline">
          Giriş yapın
        </Link>
      </p>
    </>
  );
}
