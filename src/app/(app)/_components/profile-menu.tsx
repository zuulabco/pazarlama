"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import popover from "@/components/ui/popover.module.css";
import { setTheme, useTheme } from "@/lib/theme";

const itemClass = "flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-sm transition-colors";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted">
      {children}
    </svg>
  );
}

/** Sağ üstteki hesap simgesi ve açılır menüsü: profil, plan, ayarlar, tema, çıkış. */
export function ProfileMenu({ name, email }: { name: string | null; email: string | null }) {
  const router = useRouter();
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const dark = useTheme() === "dark";

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
    router.replace("/");
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label="Hesap menüsü"
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 place-items-center rounded-full bg-sunken text-ink ring-1 ring-line transition-[box-shadow,background-color] hover:ring-line-strong aria-expanded:ring-2 aria-expanded:ring-forest"
      >
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="10" cy="7.5" r="3.2" />
          <path d="M3.8 16.6c.9-3 3.3-4.6 6.2-4.6s5.3 1.6 6.2 4.6" />
        </svg>
      </button>

      <div
        id={id}
        data-open={open}
        inert={!open}
        className={`${popover.popover} absolute right-0 bottom-full z-50 mb-2 w-72 origin-bottom-right rounded-panel md:right-auto md:bottom-0 md:left-full md:mb-0 md:ml-3 md:origin-bottom-left bg-surface p-2 shadow-float ring-1 ring-line`}
      >
        <div className="px-3 py-2.5">
          <p className="truncate font-medium">{name ?? "Hesabım"}</p>
          {email && <p className="truncate text-sm text-muted">{email}</p>}
        </div>
        <hr className="my-1.5 border-line" />

        <Link href="/panel/profil" onClick={() => setOpen(false)} className={`${itemClass} hover:bg-sunken`}>
          <Icon>
            <circle cx="10" cy="7" r="3" />
            <path d="M4 16.5c.8-2.8 3-4.2 6-4.2s5.2 1.4 6 4.2" />
          </Icon>
          Profil
        </Link>
        <div className={`${itemClass} cursor-default text-muted`} aria-disabled="true">
          <Icon>
            <path d="m10 3 2 4.5 4.8.600-3.5 3.3.900 4.800L10 13.8 5.8 16.200l.9-4.800L3.2 8.1 8 7.5 10 3Z" />
          </Icon>
          <span className="flex-1">Planı yükselt</span>
          <span className="rounded-full bg-sunken px-2 py-0.5 text-xs">Yakında</span>
        </div>
        <div className={`${itemClass} cursor-default text-muted`} aria-disabled="true">
          <Icon>
            <circle cx="10" cy="10" r="2.5" />
            <path d="M10 2.800v2m0 10.400v2M2.8 10h2m10.4 0h2M5 5l1.4 1.400m7.2 7.200L15 15M15 5l-1.4 1.400M6.4 13.6 5 15" />
          </Icon>
          <span className="flex-1">Ayarlar</span>
          <span className="rounded-full bg-sunken px-2 py-0.5 text-xs">Yakında</span>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={dark}
          onClick={() => setTheme(dark ? "light" : "dark")}
          className={`group ${itemClass} hover:bg-sunken`}
        >
          <Icon>
            <path d="M16.2 11.600A6.5 6.5 0 0 1 8.4 3.800a6.5 6.5 0 1 0 7.8 7.800Z" />
          </Icon>
          <span className="flex-1">Koyu mod</span>
          <span className="relative h-6 w-11 rounded-full bg-line-strong transition-colors duration-300 group-aria-checked:bg-forest" aria-hidden="true">
            <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-300 group-aria-checked:translate-x-5" />
          </span>
        </button>

        <hr className="my-1.5 border-line" />
        <button type="button" onClick={signOut} disabled={signingOut} className={`${itemClass} hover:bg-sunken disabled:opacity-50`}>
          <Icon>
            <path d="M8 3.500H5.500A1.5 1.5 0 0 0 4 5v10a1.5 1.5 0 0 0 1.5 1.500H8M12.5 6.5 16 10l-3.5 3.500M16 10H8.5" />
          </Icon>
          {signingOut ? "Çıkış yapılıyor…" : "Oturumu kapat"}
        </button>
      </div>
    </div>
  );
}
