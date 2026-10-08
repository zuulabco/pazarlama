/** Adspine logosu: basit çam ağacı (pine) simgesi. */
export function Wordmark({ className = "", textClassName = "" }: { className?: string; textClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-lg font-semibold tracking-tight ${className}`}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M12 2 6.5 10h3L5 16h14l-4.5-6h3z" fill="var(--color-forest)" strokeLinejoin="round" />
        <rect x="10.8" y="16" width="2.4" height="5" rx="0.6" fill="var(--color-forest)" />
      </svg>
      <span className={textClassName}>Adspine</span>
    </span>
  );
}
