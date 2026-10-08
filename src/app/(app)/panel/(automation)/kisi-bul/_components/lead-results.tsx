"use client";

import { Button } from "@/components/ui/button";
import { LockIcon, PlusIcon } from "@/components/ui/icons";
import type { LeadBrowse } from "@/modules/outreach/lead-options";

const num = (n: number) => new Intl.NumberFormat("tr-TR").format(n);

/** Gizli alan: e-posta ve LinkedIn, kişi eklenince açılır. */
function Locked({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted" title={`${label}: kişi eklenince açılır`}>
      <LockIcon size={13} />
      <span aria-hidden="true">••••••••</span>
      <span className="sr-only">{label} gizli</span>
    </span>
  );
}

/**
 * Sonuç tablosu (Instantly: Full name · Title · Company · Location · LinkedIn). Soyadı kısaltılmış, e-posta ve LinkedIn gizli;
 * satırlar seçilip "Kişileri ekle" ile açılır. Zaten kayıtlı satırlar seçilemez.
 */
export function LeadResults({
  search,
  selected,
  onToggle,
  onToggleAll,
  onAdd,
}: {
  search: LeadBrowse;
  selected: ReadonlySet<number>;
  onToggle: (rid: number) => void;
  onToggleAll: (all: boolean) => void;
  onAdd: () => void;
}) {
  const selectable = search.rows.filter((r) => !r.owned);
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.rid));
  const hiddenNote = [search.hidden.owned > 0 && `${num(search.hidden.owned)} kişi zaten kayıtlı olduğu için gizlendi`, search.hidden.sameCompany > 0 && `${num(search.hidden.sameCompany)} kişi aynı şirketten olduğu için gizlendi`].filter(Boolean).join(" · ");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-0.5">
          <h3 className="text-lg font-semibold tracking-tight">{num(search.rows.length)} kişi listelendi</h3>
          <p className="text-sm text-muted">
            Aramanıza uyan ilk {num(search.found)} kayıt. Daha fazlası için listelenecek kişi sayısını artırıp yeniden arayın.
            {hiddenNote ? ` ${hiddenNote}.` : ""}
          </p>
        </div>
        <Button onClick={onAdd} disabled={selected.size === 0}>
          <PlusIcon size={16} />
          {selected.size > 0 ? `${num(selected.size)} kişiyi ekle` : "Kişileri ekle"}
        </Button>
      </div>

      {search.rows.length === 0 ? (
        <p className="rounded-row bg-pollen/50 px-4 py-3 text-sm">Gösterilecek kişi kalmadı. Filtreleri gevşetin ya da “zaten kayıtlı” ve “her şirketten bir kişi” anahtarlarını kapatın.</p>
      ) : (
        <div className="overflow-x-auto rounded-row ring-1 ring-line">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="bg-sunken/60 text-xs text-muted">
              <tr>
                <th scope="col" className="w-10 px-3 py-2.5">
                  <input type="checkbox" aria-label="Tümünü seç" checked={allSelected} onChange={(e) => onToggleAll(e.target.checked)} disabled={selectable.length === 0} className="size-4 accent-[var(--color-forest)]" />
                </th>
                {["Ad", "Unvan", "Şirket", "Konum", "E-posta", "LinkedIn"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {search.rows.map((r) => (
                <tr key={r.rid} className={`border-t border-line transition-colors ${selected.has(r.rid) ? "bg-forest-soft/40" : "hover:bg-sunken/40"}`}>
                  <td className="px-3 py-2.5">
                    <input type="checkbox" aria-label={`${r.name} seç`} checked={selected.has(r.rid)} disabled={r.owned} onChange={() => onToggle(r.rid)} className="size-4 accent-[var(--color-forest)] disabled:opacity-40" />
                  </td>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{r.name}</td>
                  <td className="max-w-[16rem] px-3 py-2.5">{r.jobTitle ?? "—"}</td>
                  <td className="max-w-[14rem] px-3 py-2.5">{r.company ?? "—"}</td>
                  <td className="max-w-[13rem] px-3 py-2.5 text-muted">{r.location ?? "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.owned ? <span className="rounded-full bg-forest-soft px-2.5 py-1 text-xs font-medium text-accent">Kayıtlı</span> : <Locked label="E-posta" />}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.owned ? "—" : <Locked label="LinkedIn" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
