"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
    router.replace("/");
    router.refresh();
  }

  return (
    <Button variant="quiet" onClick={signOut} disabled={pending} className="px-2.5 sm:px-4">
      {pending ? "Çıkış yapılıyor…" : "Çıkış yap"}
    </Button>
  );
}
