import type { LeadRow as Lead } from "@/modules/leads/repository";
import { LeadRow } from "./lead-row";

/** Firma listesi. `favorites`, kullanıcının takibe aldığı firmaların Google yer kimlikleridir. */
export function LeadList({ rows, favorites }: { rows: Lead[]; favorites: Set<string> }) {
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-b-panel">
      {rows.map((lead, i) => (
        <LeadRow key={lead.id} lead={lead} favorited={favorites.has(lead.place_id)} rank={i} />
      ))}
    </ol>
  );
}
