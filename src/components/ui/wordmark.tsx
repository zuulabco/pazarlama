/** Sinyal logosu: merkezden yayılan iki yay + nokta. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-lg font-semibold tracking-tight ${className}`}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <circle cx="6" cy="18" r="2.6" fill="var(--color-forest)" />
        <path d="M6 10.5a7.5 7.5 0 0 1 7.5 7.5" fill="none" stroke="var(--color-forest)" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M6 3.5A14.5 14.5 0 0 1 20.5 18" fill="none" stroke="var(--color-forest)" strokeWidth="2.4" strokeLinecap="round" opacity="0.45" />
      </svg>
      Sinyal
    </span>
  );
}
