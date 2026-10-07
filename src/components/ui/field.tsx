import { useId, type ComponentProps } from "react";

type FieldProps = ComponentProps<"input"> & { label: string; hint?: string; error?: string };

export function Field({ label, hint, error, className = "", ...props }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="h-11 rounded-control bg-surface px-3.5 ring-1 ring-line-strong ring-inset transition-shadow outline-none placeholder:text-muted focus:ring-2 focus:ring-forest aria-invalid:ring-danger"
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
