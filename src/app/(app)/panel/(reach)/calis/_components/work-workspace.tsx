"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Toaster } from "@/components/ui/toast";
import type { WorkFirm, WorkKind } from "@/modules/work/context";
import type { ContactPick } from "@/modules/outreach/contacts";
import { Composer, type PickerItem } from "./composer";

type Service = { value: string; label: string };

export function WorkWorkspace({
  favorites,
  contacts,
  initialContactId,
  firm,
  initialKind,
  services,
  suggestedService,
}: {
  favorites: PickerItem[];
  contacts: ContactPick[];
  initialContactId: string | null;
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
        <h2 className="text-xl font-semibold tracking-tight">Kişilere ve firmalara mesaj hazırlayın</h2>
        <p className="max-w-[44rem] text-muted">
          Alıcıyı (kayıtlı bir kişi ya da firma) seçin, amacı ve tonu belirleyin; Adspine AI işletmenize ve alıcıya göre gönderilmeye hazır bir mesaj yazsın. Düzenleyin, tek tıkla WhatsApp&apos;ta ya da e-postada gönderin.
        </p>
      </div>
      <div className={`transition-opacity duration-200 ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
        <Composer
          favorites={favorites}
          contacts={contacts}
          initialContactId={initialContactId}
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
