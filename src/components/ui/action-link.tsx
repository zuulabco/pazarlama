import type { ReactNode } from "react";

const base =
  "inline-flex items-center gap-2 rounded-full text-sm font-medium text-ink ring-1 ring-line-strong ring-inset transition-[background-color,color,box-shadow] duration-200 hover:bg-forest-soft hover:text-forest hover:ring-forest/40";

/**
 * İletişim eylemi bağlantısı (ara, web sitesi, harita). Simgeli kapsül; `iconOnly` ise yalnızca yuvarlak
 * simge (dar kartlar için) — erişilebilir ad `label` ile verilir.
 */
export function ActionLink({
  href,
  icon,
  label,
  iconOnly = false,
  external = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  iconOnly?: boolean;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`${base} ${iconOnly ? "size-9 justify-center" : "h-9 px-3.5"}`}
    >
      {icon}
      {!iconOnly && label}
    </a>
  );
}
