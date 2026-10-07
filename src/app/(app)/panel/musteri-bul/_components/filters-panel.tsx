"use client";

import Link from "next/link";
import { useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ComboField } from "@/components/ui/combo-field";
import { provinces } from "@/modules/profile/cities";
import { businessTypes } from "@/modules/leads/business-types";
import { searchLimits } from "@/modules/leads/config";
import { districtsOf } from "@/modules/leads/location";
import { filterKeys, type Navigate, type ResultFilters, type SearchView } from "./types";

const typeOptions = businessTypes.map((t) => ({ value: t, label: t }));
const provinceOptions = provinces.map((p) => ({ value: p, label: p }));

const statusLabel: Record<SearchView["status"], string> = {
  pending: "Başlıyor",
  scraping: "Toplanıyor",
  scoring: "Puanlanıyor",
  done: "Tamamlandı",
  failed: "Başarısız",
};

const chevron = (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="shrink-0 text-muted transition-transform duration-200 group-aria-expanded:rotate-180">
    <path d="m3.5 6 4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Apollo tarzı daraltılabilir süzgeç grubu. */
function FilterGroup({
  title,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string;
  badge?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="border-t border-line first:border-t-0">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="group flex w-full items-center justify-between gap-3 rounded-control px-5 py-4 text-left font-medium hover:bg-sunken/50"
        >
          <span className="flex items-center gap-2">
            {title}
            {badge ? <span className="rounded-full bg-forest px-2 py-0.5 text-xs font-medium text-white">{badge}</span> : null}
          </span>
          {chevron}
        </button>
      </h3>
      <div id={id} hidden={!open} className="grid gap-4 px-5 pb-5">
        {children}
      </div>
    </section>
  );
}

/** Tek seçimli düğme grubu: seçili olana tekrar basmak süzgeci kaldırır. */
function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | undefined;
  onChange: (next: T | undefined) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const pressed = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(pressed ? undefined : o.value)}
            className="inline-flex h-9 min-w-14 items-center justify-center rounded-full px-4 text-sm ring-1 transition-[background-color,color,transform] duration-150 ring-inset active:scale-95 aria-pressed:bg-forest aria-pressed:text-white aria-pressed:ring-forest aria-[pressed=false]:bg-surface aria-[pressed=false]:ring-line-strong aria-[pressed=false]:hover:bg-sunken"
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

type Errors = Partial<Record<"query" | "province" | "district" | "maxResults", string>>;

export function FiltersPanel({
  defaults,
  filters,
  searches,
  selectedId,
  navigate,
  hasResults,
  busy,
  onSubmitStart,
  onCreated,
  onFailed,
}: {
  defaults: { province: string; district: string };
  filters: ResultFilters;
  searches: SearchView[];
  selectedId: string | null;
  navigate: Navigate;
  hasResults: boolean;
  busy: boolean;
  onSubmitStart: () => void;
  onCreated: (id: string) => void;
  onFailed: () => void;
}) {
  // ── Arama formu ──
  const [query, setQuery] = useState<string[]>([]);
  const [province, setProvince] = useState<string[]>(defaults.province ? [defaults.province] : []);
  const [district, setDistrict] = useState<string[]>(defaults.district ? [defaults.district] : []);
  const [countText, setCountText] = useState(String(searchLimits.defaultResults));
  const [withoutWebsite, setWithoutWebsite] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const districtOptions = useMemo(
    () => (province[0] ? districtsOf(province[0]).map((d) => ({ value: d, label: d })) : []),
    [province],
  );
  const count = Number(countText);
  const countOptions = [
    ...searchLimits.presets.map((n) => ({ value: n, label: String(n) })),
    { value: searchLimits.maxResults, label: "Tümü" },
  ];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const next: Errors = {};
    if ((query[0]?.trim().length ?? 0) < 2) next.query = "Lütfen geçerli bir firma türü girin.";
    if (!province[0]) next.province = "Bir il seçin.";
    if (!Number.isInteger(count) || count < 1 || count > searchLimits.maxResults) {
      next.maxResults = `1 ile ${searchLimits.maxResults} arasında bir sayı girin.`;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmitStart(); // sonuç alanı anında yükleme animasyonunu gösterir
    try {
      const res = await fetch("/api/leads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query[0],
          province: province[0],
          district: district[0] || undefined,
          maxResults: count,
          withoutWebsite,
        }),
      });
      const body = (await res.json().catch(() => null)) as { id?: string; error?: string; field?: keyof Errors } | null;
      if (!res.ok || !body?.id) {
        if (body?.field) setErrors({ [body.field]: body.error });
        else setFormError(body?.error ?? "Arama başlatılamadı. Tekrar deneyin.");
        return onFailed();
      }
      onCreated(body.id);
    } catch {
      setFormError("Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.");
      onFailed();
    }
  }

  // ── Sonuç süzgeçleri ──
  const active = filterKeys.filter((k) => filters[k] !== undefined).length;
  const setFilter = (key: (typeof filterKeys)[number]) => (value: string | number | undefined) =>
    navigate((p) => (value === undefined ? p.delete(key) : p.set(key, String(value))));

  return (
    <div className="overflow-visible rounded-panel bg-surface ring-1 ring-line">
      <FilterGroup title="Yeni arama">
        <form onSubmit={submit} noValidate className="grid gap-5">
          <ComboField
            legend="Hangi tür firmalar?"
            options={typeOptions}
            value={query}
            onChange={(v) => {
              setQuery(v);
              setErrors((x) => ({ ...x, query: undefined }));
            }}
            single
            allowCustom
            placeholder="Örn. diş kliniği, kafe"
            error={errors.query}
          />

          <div className="grid gap-4">
            <ComboField
              legend="İl"
              options={provinceOptions}
              value={province}
              onChange={(v) => {
                setProvince(v);
                setDistrict([]); // ilçe, seçilen ile aittir
                setErrors((x) => ({ ...x, province: undefined, district: undefined }));
              }}
              single
              placeholder="İl seçin"
              error={errors.province}
            />
            <ComboField
              legend="İlçe"
              hint="İsteğe bağlı. Boş bırakırsanız tüm il taranır."
              options={districtOptions}
              value={district}
              onChange={(v) => {
                setDistrict(v);
                setErrors((x) => ({ ...x, district: undefined }));
              }}
              single
              disabled={!province[0]}
              placeholder={province[0] ? "Tüm ilçeler" : "Önce il seçin"}
              error={errors.district}
            />
          </div>

          <fieldset className="grid gap-3">
            <legend className="mb-0.5 text-base font-medium">
              Listelenecek firma sayısı
              <span className="mt-0.5 block text-sm font-normal text-muted">Az firma daha hızlı sonuç verir. Tümü en fazla {searchLimits.maxResults} firmadır.</span>
            </legend>
            <Segmented
              label="Hazır firma sayıları"
              options={countOptions}
              value={countOptions.find((o) => o.value === count)?.value}
              onChange={(v) => v !== undefined && setCountText(String(v))}
            />
            <label className="flex items-center gap-3 text-sm text-muted">
              <span className="shrink-0">ya da bir sayı yazın</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={searchLimits.maxResults}
                value={countText}
                onChange={(e) => {
                  setCountText(e.target.value);
                  setErrors((x) => ({ ...x, maxResults: undefined }));
                }}
                aria-invalid={errors.maxResults ? true : undefined}
                className="h-10 w-24 rounded-control bg-surface px-3 text-base text-ink tabular-nums ring-1 ring-line-strong ring-inset outline-none focus:ring-2 focus:ring-forest aria-invalid:ring-danger"
              />
            </label>
            {errors.maxResults && (
              <p role="alert" className="text-sm text-danger">
                {errors.maxResults}
              </p>
            )}
          </fieldset>

          <label className="flex cursor-pointer items-start gap-3">
            <span className="relative mt-0.5 inline-flex h-6 w-10 shrink-0">
              <input
                type="checkbox"
                role="switch"
                checked={withoutWebsite}
                onChange={(e) => setWithoutWebsite(e.target.checked)}
                className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0"
              />
              <span className="absolute inset-0 rounded-full bg-line-strong transition-colors peer-checked:bg-forest peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest" />
              <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-4" />
            </span>
            <span className="grid gap-0.5">
              <span className="font-medium">Yalnızca web sitesi olmayanlar</span>
              <span className="text-sm text-muted">Sadece web sitesi olmayan firmaları arar; web sitesi satanlar için daha isabetlidir.</span>
            </span>
          </label>

          {formError && (
            <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">
              {formError}
            </p>
          )}

          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? "Aranıyor…" : "Firmaları bul"}
          </Button>
        </form>
      </FilterGroup>

      <FilterGroup title="Sonuçları daralt" badge={active}>
        {!hasResults && <p className="text-sm text-muted">Sonuçlar geldiğinde buradan daraltabilirsiniz.</p>}
        <div className="grid gap-5" aria-disabled={!hasResults}>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Genel skor</p>
            <Segmented label="Genel skor" options={[{ value: 50, label: "50+" }, { value: 70, label: "70+" }, { value: 85, label: "85+" }]} value={filters.min} onChange={setFilter("min")} />
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Dijital ihtiyaç</p>
            <Segmented label="Dijital ihtiyaç" options={[{ value: 60, label: "60+" }, { value: 80, label: "80+" }]} value={filters.dn} onChange={setFilter("dn")} />
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Web sitesi</p>
            <Segmented label="Web sitesi" options={[{ value: "var", label: "Var" }, { value: "yok", label: "Yok" }]} value={filters.web} onChange={setFilter("web")} />
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Telefon numarası</p>
            <Segmented label="Telefon numarası" options={[{ value: "var", label: "Var" }, { value: "yok", label: "Yok" }]} value={filters.tel} onChange={setFilter("tel")} />
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Google puanı</p>
            <Segmented label="Google puanı" options={[{ value: 4, label: "4,0+" }, { value: 4.5, label: "4,5+" }]} value={filters.star} onChange={setFilter("star")} />
          </div>
          {active > 0 && (
            <button
              type="button"
              onClick={() => navigate((p) => filterKeys.forEach((k) => p.delete(k)))}
              className="justify-self-start rounded-control px-1 text-sm font-medium text-forest underline underline-offset-4 hover:no-underline"
            >
              Süzgeçleri temizle
            </button>
          )}
        </div>
      </FilterGroup>

      {searches.length > 0 && (
        <FilterGroup title="Son aramalar" defaultOpen={false}>
          <ul className="-mx-2 grid gap-0.5">
            {searches.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/panel/musteri-bul?s=${s.id}`}
                  aria-current={s.id === selectedId ? "true" : undefined}
                  className="grid gap-0.5 rounded-control px-3 py-2.5 hover:bg-sunken/60 aria-[current=true]:bg-forest-soft"
                >
                  <span className="truncate text-sm font-medium">{s.query} · {s.location}</span>
                  <span className="text-xs text-muted">
                    {statusLabel[s.status]}
                    {s.status === "done" ? ` · ${s.scored} firma` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </FilterGroup>
      )}
    </div>
  );
}
