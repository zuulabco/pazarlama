"use client";

import { ComboField } from "@/components/ui/combo-field";
import { Disclosure } from "@/components/ui/disclosure";
import { Switch } from "@/components/ui/switch";
import { countryOptions, industryOptions, roleOptions, sizeOptions, titleDictionary, type LeadSearchInput } from "@/modules/outreach/lead-options";

const inputClass =
  "h-11 w-full min-w-0 rounded-control bg-surface px-3.5 ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest";
const titleOptions = titleDictionary.map((t) => ({ value: t, label: t }));
const groupClass = "rounded-row bg-surface ring-1 ring-line";

function GroupTitle({ title, count }: { title: string; count: number }) {
  return (
    <span className="flex items-center gap-2 font-medium">
      {title}
      {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-forest px-1.5 text-xs font-medium text-white">{count}</span>}
    </span>
  );
}

/**
 * Sol filtre çubuğu (Instantly SuperSearch yapısı): açılır gruplar, her grupta seçili filtre sayısı rozeti,
 * altta "zaten kayıtlı olanları atla" ve "her şirketten bir kişi" anahtarları, Kaydet/Yükle düğmeleri.
 */
export function LeadFilters({
  q,
  set,
  skipOwned,
  oneLead,
  onSkipOwned,
  onOneLead,
  onClear,
  onSave,
  onLoad,
  activeCount,
}: {
  q: LeadSearchInput;
  set: (patch: Partial<LeadSearchInput>) => void;
  skipOwned: boolean;
  oneLead: boolean;
  onSkipOwned: (v: boolean) => void;
  onOneLead: (v: boolean) => void;
  onClear: () => void;
  onSave: () => void;
  onLoad: () => void;
  activeCount: number;
}) {
  const person = q.roles.length + q.titles.length + q.notTitles.length;
  const location = (q.city?.trim() ? 1 : 0) + (q.country !== "turkey" ? 1 : 0);
  const company = q.industries.length + q.sizes.length;
  const keywords = q.keywords.length + q.notKeywords.length;

  return (
    <aside aria-label="Filtreler" className="grid content-start gap-3 lg:sticky lg:top-14">
      <Disclosure defaultOpen className={groupClass} buttonClassName="px-4 py-3.5" panelClassName="px-4 pb-4" summary={<GroupTitle title="Unvan" count={person} />}>
        <div className="grid gap-5">
          <ComboField legend="Şunlardan herhangi biri" hint="Yazdıkça öneriler çıkar; listede olmayan unvanı da ekleyebilirsiniz." options={titleOptions} value={q.titles} onChange={(titles) => set({ titles })} allowCustom max={8} normalize={(t) => t.trim()} placeholder="Unvan arayın" />

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Kişi türü (kıdem ve departman)</legend>
            <div className="flex flex-wrap gap-2">
              {roleOptions.map((r) => {
                const on = q.roles.includes(r.value);
                return (
                  <button
                    key={r.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set({ roles: on ? q.roles.filter((x) => x !== r.value) : [...q.roles, r.value] })}
                    className="h-9 rounded-full px-3.5 text-sm ring-1 ring-line-strong ring-inset transition-colors hover:bg-sunken aria-pressed:bg-forest aria-pressed:font-medium aria-pressed:text-white aria-pressed:ring-forest"
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <ComboField legend="Şunlardan hiçbiri" hint="Örn. “Product Owner” gelmesin diye “Product”." options={titleOptions} value={q.notTitles} onChange={(notTitles) => set({ notTitles })} allowCustom max={8} normalize={(t) => t.trim()} placeholder="Hariç tutulacak unvan" />

          <Switch checked={q.excludeJunior} onChange={(excludeJunior) => set({ excludeJunior })} label="Stajyer ve asistanları hariç tut" />
        </div>
      </Disclosure>

      <Disclosure defaultOpen className={groupClass} buttonClassName="px-4 py-3.5" panelClassName="px-4 pb-4" summary={<GroupTitle title="Konum" count={location} />}>
        <div className="grid gap-4">
          <ComboField legend="Ülke" options={countryOptions} value={[q.country]} onChange={(v) => set({ country: v[0] ?? "turkey" })} single placeholder="Ülke seçin" />
          <label className="grid gap-1.5 text-sm font-medium">
            Şehir (isteğe bağlı)
            <input value={q.city ?? ""} onChange={(e) => set({ city: e.target.value })} maxLength={60} placeholder="Örn. İstanbul" className={inputClass} />
            <span className="text-sm font-normal text-muted">Yazarsanız yalnızca o şehirdekiler aranır.</span>
          </label>
        </div>
      </Disclosure>

      <Disclosure className={groupClass} buttonClassName="px-4 py-3.5" panelClassName="px-4 pb-4" summary={<GroupTitle title="Sektör ve büyüklük" count={company} />}>
        <div className="grid gap-4">
          <ComboField legend="Sektör" options={industryOptions} value={q.industries} onChange={(industries) => set({ industries })} max={6} placeholder="Sektör arayın" />
          <ComboField legend="Çalışan sayısı" options={sizeOptions} value={q.sizes} onChange={(sizes) => set({ sizes })} max={5} placeholder="Büyüklük seçin" />
        </div>
      </Disclosure>

      <Disclosure className={groupClass} buttonClassName="px-4 py-3.5" panelClassName="px-4 pb-4" summary={<GroupTitle title="Anahtar kelimeler" count={keywords} />}>
        <div className="grid gap-4">
          <ComboField legend="Şunlardan herhangi biri" hint="Şirketin faaliyetinde geçen kelimeler (örn. e-commerce, restaurant)." options={[]} value={q.keywords} onChange={(k) => set({ keywords: k })} allowCustom max={5} normalize={(t) => t.trim().toLowerCase()} placeholder="Kelime yazın" />
          <ComboField legend="Şunlardan hiçbiri" options={[]} value={q.notKeywords} onChange={(k) => set({ notKeywords: k })} allowCustom max={5} normalize={(t) => t.trim().toLowerCase()} placeholder="Hariç tutulacak kelime" />
        </div>
      </Disclosure>

      <div className="grid gap-4 rounded-row bg-sunken/60 p-4">
        <Switch checked={skipOwned} onChange={onSkipOwned} label="Zaten kayıtlı olanları atla" hint="Kişilerinizde olanlar sonuçta görünmez." />
        <Switch checked={oneLead} onChange={onOneLead} label="Her şirketten bir kişi" hint="Aynı şirketten yalnızca ilk kişi gösterilir." />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onLoad} className="h-10 rounded-control text-sm font-medium ring-1 ring-line-strong ring-inset transition-colors hover:bg-sunken">
          Yükle
        </button>
        <button type="button" onClick={onSave} className="h-10 rounded-control text-sm font-medium ring-1 ring-line-strong ring-inset transition-colors hover:bg-sunken">
          Kaydet
        </button>
      </div>
      {activeCount > 0 && (
        <div className="flex items-center justify-between gap-3 px-1 text-sm text-muted">
          <span>{activeCount} filtre seçili</span>
          <button type="button" onClick={onClear} className="underline underline-offset-4 hover:text-ink">
            Filtreleri temizle
          </button>
        </div>
      )}
    </aside>
  );
}
