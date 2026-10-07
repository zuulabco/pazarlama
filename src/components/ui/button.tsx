import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "quiet" | "inverse";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap transition-colors duration-150";

const variants: Record<Variant, string> = {
  primary: "bg-forest text-white hover:bg-forest-hover",
  secondary: "bg-surface text-ink ring-1 ring-line-strong ring-inset hover:bg-sunken",
  quiet: "text-ink hover:bg-sunken",
  /** Koyu (forest) zemin üzerinde */
  inverse: "bg-white text-forest hover:bg-forest-soft focus-visible:outline-white",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function ButtonLink({ variant = "primary", size = "md", className = "", ...props }: ButtonLinkProps) {
  return <Link className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}
