import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Panel" };

async function Greeting() {
  const user = await requireUser();
  const firstName = user.name?.split(" ")[0];
  return (
    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
      {firstName ? `Merhaba ${firstName}` : "Merhaba"}
    </h1>
  );
}

export default function PanelPage() {
  return (
    <>
      <Suspense fallback={<div className="h-10 w-48 rounded-control bg-sunken" />}>
        <Greeting />
      </Suspense>
      <p className="mt-3 max-w-prose text-muted">
        Hesabınız hazır. Hedef bilgileriniz ve Müşteri Bul modülü bir sonraki adımda burada olacak.
      </p>
    </>
  );
}
