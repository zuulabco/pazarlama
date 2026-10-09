import Link from "next/link";
import { MapPinIcon, SearchIcon, UsersIcon } from "@/components/ui/icons";

const sources = [
  { key: "db", label: "Veritabanında ara", hint: "Unvan, sektör ve konuma göre karar vericiler; iş e-postasıyla", href: "/panel/kisi-bul", icon: SearchIcon },
  { key: "maps", label: "Haritadan işletme bul", hint: "Bölgenizdeki yerel işletmeler; telefon, adres ve puanlarıyla", href: "/panel/musteri-bul", icon: MapPinIcon },
  { key: "own", label: "Kendi listemi getireyim", hint: "CSV yükleyin ya da kayıtlı kişilerinizden başlayın", href: "/panel/kisiler", icon: UsersIcon },
] as const;

/**
 * Arama başlangıç kartları (Instantly'deki "Search the database · Start from companies · Bring your own"): kullanıcı önce
 * nereden başlayacağını seçer; ayrı bir "kişi mi firma mı" ayrımı sormayız. Seçili kaynak vurgulanır.
 */
export function FindSources({ active }: { active: "db" | "maps" }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {sources.map((s) => {
        const on = s.key === active;
        const Icon = s.icon;
        return (
          <li key={s.key}>
            <Link
              href={s.href}
              aria-current={on ? "true" : undefined}
              className="group flex h-full flex-col gap-2 rounded-row p-4 ring-1 ring-line transition-[background-color,box-shadow] duration-200 hover:bg-sunken/50 aria-[current=true]:bg-forest-soft/60 aria-[current=true]:ring-2 aria-[current=true]:ring-forest"
            >
              <span className="grid size-9 place-items-center rounded-full bg-sunken text-muted transition-colors group-aria-[current=true]:bg-forest group-aria-[current=true]:text-white">
                <Icon size={18} />
              </span>
              <span className="font-medium">{s.label}</span>
              <span className="text-sm text-muted">{s.hint}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
