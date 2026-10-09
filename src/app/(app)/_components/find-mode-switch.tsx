"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPinIcon, UsersIcon } from "@/components/ui/icons";
import { matches, onFirms } from "./nav-config";

const modes = [
  { key: "kisi", label: "Kişiler", hint: "Karar vericiler ve iş e-postaları: e-posta otomasyonu için", icon: UsersIcon, search: "/panel/kisi-bul", saved: "/panel/kisiler" },
  { key: "firma", label: "İşletmeler", hint: "Haritadaki işletmeler, telefon ve adres: arama ve WhatsApp için", icon: MapPinIcon, search: "/panel/musteri-bul", saved: "/panel/firmalar" },
] as const;

/** Kaydedilenler sayfasındaki ince seçici (Kişiler · İşletmeler): iki ayrı kayıtlı liste arasında geçiş. */
export function FindModeSwitch() {
  const path = usePathname();
  // Arama ekranlarında ayrım yok (kaynak kartları var); yalnızca kayıtlı veriler iki ayrı listede durur.
  if (!matches(path, ["/panel/kisiler", "/panel/firmalar"])) return null;
  const firms = onFirms(path);
  const inSaved = true;

  return (
    <nav aria-label="Aranan müşteri türü" className="mb-5 inline-flex rounded-full bg-sunken p-1">
      {modes.map((m) => {
        const active = (m.key === "firma") === firms;
        const Icon = m.icon;
        return (
          <Link
            key={m.key}
            href={inSaved ? m.saved : m.search}
            title={m.hint}
            aria-current={active ? "true" : undefined}
            className="inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted transition-[background-color,color,box-shadow] duration-200 hover:text-ink aria-[current=true]:bg-surface aria-[current=true]:text-ink aria-[current=true]:shadow-sm aria-[current=true]:ring-1 aria-[current=true]:ring-line"
          >
            <Icon size={16} />
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}
