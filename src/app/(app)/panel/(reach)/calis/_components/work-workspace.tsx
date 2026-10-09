"use client";

import { Toaster } from "@/components/ui/toast";
import type { WorkKind } from "@/modules/work/context";
import type { ContactPick } from "@/modules/outreach/contacts";
import { Composer } from "./composer";

type Service = { value: string; label: string };

export function WorkWorkspace({
  contacts,
  initialContactId,
  initialKind,
  services,
  suggestedService,
}: {
  contacts: ContactPick[];
  initialContactId: string | null;
  initialKind: WorkKind;
  services: Service[];
  suggestedService: string | null;
}) {
  return (
    <div className="grid gap-6">
      <Toaster />
      <div className="grid gap-1.5">
        <h2 className="text-xl font-semibold tracking-tight">Kişilere mesaj hazırlayın</h2>
        <p className="max-w-[44rem] text-muted">
          Alıcıyı (kayıtlı bir kişi ya da kendi yazdığınız bilgiler) seçin, amacı ve tonu belirleyin; Adspine AI işletmenize ve alıcıya göre gönderilmeye hazır bir mesaj yazsın. Düzenleyin, tek tıkla WhatsApp&apos;ta ya da e-postada gönderin.
        </p>
      </div>
      <Composer contacts={contacts} initialContactId={initialContactId} initialKind={initialKind} services={services} suggestedService={suggestedService} />
    </div>
  );
}
