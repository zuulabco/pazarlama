import type { CSSProperties } from "react";
import { demoLeads, scoreTone } from "./demo-data";
import styles from "./ranking-demo.module.css";

export function RankingDemo() {
  return (
    <figure className="rounded-panel bg-surface shadow-float ring-1 ring-line">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5 rounded-control bg-sunken px-3 py-2 text-sm">
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" className="shrink-0 text-muted">
            <circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="m13.2 13.2 3.3 3.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="truncate">Kadıköy&apos;deki diş klinikleri</span>
        </div>
        <span className="shrink-0 text-xs text-muted">{demoLeads.length} firma</span>
      </div>

      <ol className={`${styles.list} py-2`} aria-label="Puana göre sıralanmış örnek firmalar">
        {demoLeads.map((lead, i) => (
          <li
            key={lead.name}
            className={`${styles.row} flex items-center gap-4 px-5`}
            style={{ "--from": lead.scrapedIndex, "--to": i, "--score": lead.score / 100 } as CSSProperties}
          >
            {i < 2 && <span className={styles.highlight} aria-hidden="true" />}
            <div className="relative min-w-0 flex-1">
              <p className="truncate font-medium">{lead.name}</p>
              <p className="truncate text-xs text-muted">{lead.signals}</p>
            </div>
            <div className="relative flex items-center gap-3">
              <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-sunken sm:block" aria-hidden="true">
                <span className={`${styles.bar} block h-full rounded-full ${scoreTone(lead.score)}`} />
              </span>
              <span className={`${styles.score} w-8 text-right text-xl font-semibold tabular-nums tracking-tight`}>
                {lead.score}
              </span>
            </div>
          </li>
        ))}
      </ol>

      <figcaption className="flex items-center justify-between gap-4 border-t border-line px-5 py-3.5 text-xs text-muted">
        <span className={styles.status}>İlk iki firmaya bu hafta ulaşın.</span>
        <span>Örnek veriler</span>
      </figcaption>
    </figure>
  );
}
