"use client";

import { Button } from "@/components/ui/button";
import { ComboField, type Option } from "@/components/ui/combo-field";
import { Disclosure } from "@/components/ui/disclosure";
import { BookmarkIcon, SearchIcon } from "@/components/ui/icons";
import { Switch } from "@/components/ui/switch";
import { countryOptions, industryOptions, keywordCatalog, roleOptions, sizeOptions, titleCatalog, type LeadSearchInput } from "@/modules/outreach/lead-options";

const inputClass =
  "h-11 w-full min-w-0 rounded-control bg-surface px-3.5 ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest";
const groupClass = "rounded-row bg-surface ring-1 ring-line";

/** Yalnızca Türkçe gösterilir; İngilizce karşılıklar arama için gizli eş anlamlıdır ("marketing" yazınca "Pazarlama Müdürü" çıkar). */
const titleOptions: Option[] = titleCatalog.map((t) => ({ value: t.tr, label: t.tr, aliases: t.en, group: "Unvan" }));
const personOptions: Option[] = [...roleOptions.map((r) => ({ value: `rol:${r.value}`, label: r.label, aliases: r.titles, group: "Kişi türü" })), ...titleOptions];
const industries: Option[] = industryOptions.map((o) => ({ value: o.value, label: o.label, aliases: [o.value] }));
const keywordOptions: Option[] = keywordCatalog.map((k) => ({ value: k.tr, label: k.tr, aliases: [k.en] }));

function GroupTitle({ title, count }: { title: string; count: number }) {
  return (
    <span className="flex items-center gap-2 font-medium">
      {title}
      {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-forest px-1.5 text-xs font-medium text-white">{count}</span>}
    </span>
  );
}

/**
 * Sol filtre çubuğu (Instantly SuperSearch yapısı): açılır gruplar, her grupta seçili filtre sayısı rozeti. Altta, kaydırdıkça ekranda kalan
 * "Müşteri bul" düğmesi vardır (Mesaj hazırla sayfasındaki gibi). Kayıtlı aramalar düğmenin altında ince bir satırdadır.
 * Tüm çoklu alanlar etiket (chip) girişlidir: listeden seçilir ya da yazılıp eklenir. Unvan ve kelimeler Türkçe ya da İngilizce yazılabilir;
 * arama her ikisini de kapsar. (Zaten kayıtlı kişileri atlama ve şirket başına tek kişi her zaman açıktır, bu yüzden anahtar yoktur.)
 */
export function LeadFilters({
  q,
  set,
  onClear,
  onSave,
  onLoad,
  onSearch,
  searching,
  canSearch,
  activeCount,
  defaultCountry,
}: {
  q: LeadSearchInput;
  set: (patch: Partial<LeadSearchInput>) => void;
  onClear: () => void;
  onSave: () => void;
  onLoad: () => void;
  onSearch: () => void;
  searching: boolean;
  canSearch: boolean;
  activeCount: number;
  defaultCountry: string;
}) {
  const person = q.roles.length + q.titles.length + q.notTitles.length;
  const location = (q.city?.trim() ? 1 : 0) + (q.country !== defaultCountry ? 1 : 0);
  const company = q.industries.length + q.sizes.length;
  const keywords = q.keywords.length + q.notKeywords.length;
  const personValue = [...q.roles.map((r) => `rol:${r}`), ...q.titles];

  return (
    <aside aria-label="Filtreler" className="grid content-start gap-3">
      <Disclosure defaultOpen className={groupClass} buttonClassName="px-4 py-3.5" panelClassName="px-4 pb-4" summary={<GroupTitle title="Unvan" count={person} />}>
        <div className="grid gap-5">
          <ComboField
            legend="Unvan ya da kişi türü"
            hint="Türkçe ya da İngilizce yazabilirsiniz; ikisi de aranır. Listede olmayanı yazıp ekleyin."
            options={personOptions}
            value={personValue}
            onChange={(next) => set({ roles: next.filter((v) => v.startsWith("rol:")).map((v) => v.slice(4)), titles: next.filter((v) => !v.startsWith("rol:")) })}
            allowCustom
            max={12}
            normalize={(t) => t.trim()}
            placeholder="Örn. Pazarlama Müdürü, kurucu"
          />
          <ComboField legend="Şunlardan hiçbiri" hint="Örn. “Product” yazarsanız “Product Owner” gelmez." options={titleOptions} value={q.notTitles} onChange={(notTitles) => set({ notTitles })} allowCustom max={8} normalize={(t) => t.trim()} placeholder="Hariç tutulacak unvan" />
          <Switch checked={q.excludeJunior} onChange={(excludeJunior) => set({ excludeJunior })} label="Stajyer ve asistanları hariç tut" />
        </div>
      </Disclosure>

      <Disclosure defaultOpen className={groupClass} buttonClassName="px-4 py-3.5" panelClassName="px-4 pb-4" summary={<GroupTitle title="Konum" count={location} />}>
        <div className="grid gap-4">
          <ComboField legend="Ülke" options={countryOptions} value={[q.country]} onChange={(v) => set({ country: v[0] ?? defaultCountry })} single clearable={false} placeholder="Ülke seçin" />
          <label className="grid gap-1.5 text-sm font-medium">
            Şehir (isteğe bağlı)
            <input value={q.city ?? ""} onChange={(e) => set({ city: e.target.value })} maxLength={60} placeholder="Örn. İstanbul" className={inputClass} />
            <span className="text-sm font-normal text-muted">Yazarsanız yalnızca o şehirdekiler aranır.</span>
          </label>
        </div>
      </Disclosure>

      <Disclosure className={groupClass} buttonClassName="px-4 py-3.5" panelClassName="px-4 pb-4" summary={<GroupTitle title="Sektör ve büyüklük" count={company} />}>
        <div className="grid gap-4">
          <ComboField legend="Sektör" options={industries} value={q.industries} onChange={(next) => set({ industries: next })} max={6} placeholder="Sektör arayın" />
          <ComboField legend="Çalışan sayısı" options={sizeOptions} value={q.sizes} onChange={(sizes) => set({ sizes })} max={5} placeholder="Büyüklük seçin" />
        </div>
      </Disclosure>

      <Disclosure className={groupClass} buttonClassName="px-4 py-3.5" panelClassName="px-4 pb-4" summary={<GroupTitle title="Anahtar kelimeler" count={keywords} />}>
        <div className="grid gap-4">
          <ComboField legend="Şunlardan herhangi biri" hint="Şirketin faaliyetinde geçen kelimeler. Türkçe ya da İngilizce yazabilirsiniz." options={keywordOptions} value={q.keywords} onChange={(k) => set({ keywords: k })} allowCustom max={5} normalize={(t) => t.trim().toLowerCase()} placeholder="Örn. e-ticaret" />
          <ComboField legend="Şunlardan hiçbiri" options={keywordOptions} value={q.notKeywords} onChange={(k) => set({ notKeywords: k })} allowCustom max={5} normalize={(t) => t.trim().toLowerCase()} placeholder="Hariç tutulacak kelime" />
        </div>
      </Disclosure>

      {activeCount > 0 && (
        <div className="flex items-center justify-between gap-3 px-1 text-sm text-muted">
          <span>{activeCount} filtre seçili</span>
          <button type="button" onClick={onClear} className="underline underline-offset-4 hover:text-ink">
            Filtreleri temizle
          </button>
        </div>
      )}

      {/* Kaydırdıkça ekranda kalır. */}
      <div className="sticky bottom-0 z-10 -mx-1 rounded-b-row bg-paper/95 px-1 pt-3 pb-3 backdrop-blur">
        <Button onClick={onSearch} disabled={!canSearch || searching} size="lg" className="w-full">
          <SearchIcon size={18} />
          {searching ? "Aranıyor…" : "Müşteri bul"}
        </Button>
        {!canSearch && !searching && <p className="mt-2 text-center text-xs text-muted">Önce bir unvan, sektör ya da kelime seçin.</p>}
        <div className="mt-2 flex items-center justify-center gap-1 text-sm text-muted">
          <button type="button" onClick={onLoad} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors hover:bg-sunken hover:text-ink">
            <BookmarkIcon size={14} />
            Kayıtlı aramalarım
          </button>
          <span aria-hidden="true" className="text-line-strong">
            ·
          </span>
          <button type="button" onClick={onSave} disabled={activeCount === 0} className="rounded-full px-3 py-1.5 transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40">
            Bu aramayı kaydet
          </button>
        </div>
      </div>
    </aside>
  );
}
