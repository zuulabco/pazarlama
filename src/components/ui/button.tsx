import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "quiet" | "inverse";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-forest text-white hover:bg-forest-hover",
  secondary: "bg-surface text-ink ring-1 ring-line-strong ring-inset hover:bg-sunken",
  quiet: "text-ink hover:bg-sunken",
  /** Koyu (forest) zemin üzerinde */
  inverse: "bg-white text-accent hover:bg-forest-soft focus-visible:outline-white",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

type StyleProps = { variant?: Variant; size?: Size };

function classes({ variant = "primary", size = "md" }: StyleProps, className = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={classes({ variant, size }, className)} {...props} />;
}

export function Button({ variant, size, className, type = "button", ...props }: ComponentProps<"button"> & StyleProps) {
  return <button type={type} className={classes({ variant, size }, className)} {...props} />;
}
