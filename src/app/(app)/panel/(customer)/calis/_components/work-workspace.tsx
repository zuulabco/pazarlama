"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Toaster } from "@/components/ui/toast";
import type { WorkFirm, WorkKind } from "@/modules/work/context";
import { Composer, type PickerItem } from "./composer";

type Service = { value: string; label: string };

export function WorkWorkspace({
  favorites,
  firm,
  initialKind,
  services,
  suggestedService,
}: {
  favorites: PickerItem[];
  firm: WorkFirm | null;
  initialKind: WorkKind;
  services: Service[];
  suggestedService: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function pickFirm(id: string) {
    start(() => router.replace(id ? `/panel/calis?firma=${id}` : "/panel/calis", { scroll: false }));
  }

  return (
    <div className="grid gap-6">
      <Toaster />
      <div className="grid gap-1.5">
        <h2 className="text-xl font-semibold tracking-tight">Adspine AI ile saniyeler içinde mesaj yazın</h2>
        <p className="max-w-[44rem] text-muted">
          Amacı ve tonu seçin; Adspine işletmenize ve alıcıya göre gönderilmeye hazır bir mesaj yazsın. İstediğiniz gibi düzenleyin, tek tıkla WhatsApp&apos;ta ya da
          e-postada gönderin. Takip listenizdeki bir firmayı seçerseniz mesaj o firmaya özel olur.
        </p>
      </div>
      <div className={`transition-opacity duration-200 ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
        <Composer
          favorites={favorites}
          firm={firm}
          onPickFirm={pickFirm}
          initialKind={initialKind}
          services={services}
          suggestedService={suggestedService}
        />
      </div>
    </div>
  );
}
