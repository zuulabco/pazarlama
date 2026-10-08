"use client";

import Link from "next/link";
import { CheckIcon } from "@/components/ui/icons";
import { Disclosure } from "@/components/ui/disclosure";
import type { WorkFirm } from "@/modules/work/context";

/** Seçilen firmanın mesajda kullanılacak bilgileri: kapalı gelir, isteyen açıp bakar. */
export function FirmInfo({ firm }: { firm: WorkFirm }) {
  return (
    <Disclosure
      className="rounded-row bg-surface ring-1 ring-line"
      buttonClassName="px-4 py-3"
      panelClassName="px-4 pb-4"
      summary={
        <span className="grid gap-0.5">
          <span className="text-sm font-medium">Mesajda kullanılacak bilgiler</span>
          <span className="text-xs text-muted">{[firm.category, firm.district].filter(Boolean).join(" · ") || firm.name}</span>
        </span>
      }
    >
      <div className="grid gap-4">
        <ul className="grid gap-2 text-sm">
          {firm.signals.map((s) => (
            <li key={s} className="flex gap-2.5 text-muted">
              <span className="mt-0.5 text-accent">
                <CheckIcon size={16} />
              </span>
              {s}
            </li>
          ))}
        </ul>
        {firm.notes.length > 0 && (
          <ul className="grid gap-1.5">
            {firm.notes.slice(0, 3).map((n, i) => (
              <li key={i} className="line-clamp-3 rounded-control bg-sunken/70 px-3 py-2 text-sm whitespace-pre-line">
                {n}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">Notlarınız da mesajda kullanılır. Not eklemek için Takip sayfasına bakın.</p>
        <Link href="/panel/firmalar" className="w-fit text-sm font-medium text-accent underline underline-offset-4 hover:no-underline">
          Takip listesinde aç
        </Link>
      </div>
    </Disclosure>
  );
}
