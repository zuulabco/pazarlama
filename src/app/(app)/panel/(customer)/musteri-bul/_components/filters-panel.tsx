"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Collapse } from "@/components/ui/collapse";
import { ComboField } from "@/components/ui/combo-field";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import type { Facets } from "@/modules/leads/facets";
import { provinces } from "@/modules/profile/cities";
import { businessTypes } from "@/modules/leads/business-types";
import { searchLimits } from "@/modules/leads/config";
import { districtsOf } from "@/modules/leads/location";
import { filterKeys, isActiveStatus, type Navigate, type ResultFilters, type SearchView } from "./types";

const typeOptions = businessTypes.map((t) => ({ value: t, label: t }));
const provinceOptions = provinces.map((p) => ({ value: p, label: p }));

const statusLabel: Record<SearchView["status"], string> = {
  pending: "Başlıyor",
  scraping: "Toplanıyor",
  scoring: "Puanlanıyor",
  done: "Tamamlandı",
  failed: "Başarısız",
};

/** Yazılan firma türü gerçek bir işletme türü mü? Kullanıcı yazarken sunucuya sorulur. */
async function validateBusinessType(text: string): Promise<boolean> {
  const res = await fetch(`/api/leads/validate?q=${encodeURIComponent(text)}`);
  if (!res.ok) return true; // doğrulama ulaşılamazsa engelleme; sunucu aramada yine denetler
  return ((await res.json()) as { valid: boolean }).valid;
}

/** Apollo tarzı daraltılabilir süzgeç grubu; yumuşakça açılıp kapanır. */
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
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="shrink-0 text-muted transition-transform duration-300 group-aria-expanded:rotate-180">
            <path d="m3.5 6 4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h3>
      <Collapse open={open}>
        <div id={id} className="grid gap-5 px-5 pt-1 pb-5">
          {children}
        </div>
      </Collapse>
    </section>
  );
}

type Counts = { all: number; options: Record<string, number> };

const Count = ({ n }: { n: number }) => <span className="ml-1 text-xs tabular-nums opacity-60">{n}</span>;

/** Süzgeç için "Hepsi + seçenekler" düğmeleri; "Hepsi" süzgeci kaldırır. Sayılar, seçeneğe tıklanırsa kaç firma kalacağını gösterir. */
function FilterSegmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  counts,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | undefined;
  onChange: (next: T | undefined) => void;
  counts?: Counts;
}) {
  return (
    <Segmented
      label={label}
      items={[
        {
          key: "all",
          label: (
            <>
              Hepsi{counts && <Count n={counts.all} />}
            </>
          ),
          pressed: value === undefined,
          onClick: () => onChange(undefined),
        },
        ...options.map((o) => {
          const n = counts?.options[String(o.value)];
          return {
            key: String(o.value),
            label: (
              <>
                {o.label}
                {n !== undefined && <Count n={n} />}
              </>
            ),
            pressed: value === o.value,
            onClick: () => onChange(o.value),
            disabled: n === 0 && value !== o.value,
          };
        }),
      ]}
    />
  );
}

function FilterRow({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">{title}</p>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

type CountMode = "10" | "25" | "50" | "all" | "custom";
type Errors = Partial<Record<"query" | "province" | "district" | "maxResults", string>>;

export function FiltersPanel({
  defaults,
  filters,
  searches,
  selectedId,
  navigate,
  facets,
  onOpenSearch,
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
  /** Süzgeç sayıları; seçili arama yokken (ya da sonuç yokken) null. */
  facets: Facets | null;
  /** Geçmiş bir aramayı açar (yükleme animasyonuyla). */
  onOpenSearch: (id: string) => void;
  busy: boolean;
  onSubmitStart: () => void;
  onCreated: (id: string) => void;
  onFailed: () => void;
}) {
  // ── Arama ──
  const [query, setQuery] = useState<string[]>([]);
  const [province, setProvince] = useState<string[]>(defaults.province ? [defaults.province] : []);
  const [district, setDistrict] = useState<string[]>(defaults.district ? [defaults.district] : []);
  const [countMode, setCountMode] = useState<CountMode>(String(searchLimits.defaultResults) as CountMode);
  const [customCount, setCustomCount] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const districtOptions = useMemo(
    () => (province[0] ? districtsOf(province[0]).map((d) => ({ value: d, label: d })) : []),
    [province],
  );

  const count = countMode === "all" ? searchLimits.maxResults : countMode === "custom" ? Number(customCount) : Number(countMode);
  const countItems: { mode: CountMode; label: string }[] = [
    ...searchLimits.presets.map((n) => ({ mode: String(n) as CountMode, label: String(n) })),
    { mode: "all", label: "Tümü" },
    { mode: "custom", label: "Özel" },
  ];

  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);

  async function removeSearch(id: string) {
    setRemoving(id);
    try {
      const res = await fetch(`/api/leads/searches/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (id === selectedId) router.push("/panel/musteri-bul");
        router.refresh();
      }
    } finally {
      setRemoving(null);
    }
  }

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
          // Web sitesi süzgeci, aramayı Apify tarafında da daraltır: yalnızca olmayanlar ya da olanlar.
          website: filters.web === "yok" ? "without" : filters.web === "var" ? "with" : "any",
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

  // ── Süzgeçler (liste anında daralır; web sitesi seçimi yeni aramalarda da kullanılır) ──
  const active = filterKeys.filter((k) => filters[k] !== undefined).length;
  const setFilter = (key: (typeof filterKeys)[number]) => (value: string | number | undefined) =>
    navigate((p) => (value === undefined ? p.delete(key) : p.set(key, String(value))));

  return (
    <div className="overflow-visible rounded-panel bg-surface ring-1 ring-line">
      <FilterGroup title="Arama">
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
            validateCustom={validateBusinessType}
            invalidMessage="Lütfen geçerli bir firma türü girin."
            placeholder="Örn. diş kliniği, kafe"
            error={errors.query}
          />

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

          <fieldset className="grid gap-2.5">
            <legend className="mb-0.5 text-base font-medium">
              Listelenecek firma sayısı
              <span className="mt-0.5 block text-sm font-normal text-muted">
                Az firma daha hızlı sonuç verir.
              </span>
            </legend>
            <Segmented
              label="Firma sayısı"
              items={countItems.map((c) => ({
                key: c.mode,
                label: c.label,
                pressed: countMode === c.mode,
                onClick: () => {
                  setCountMode(c.mode);
                  setErrors((x) => ({ ...x, maxResults: undefined }));
                },
              }))}
            />
            <Collapse open={countMode === "custom"}>
              <label className="flex items-center gap-3 pt-1 text-sm text-muted">
                <span className="shrink-0">Kaç firma?</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={searchLimits.maxResults}
                  value={customCount}
                  placeholder="Örn. 40"
                  onChange={(e) => {
                    setCustomCount(e.target.value);
                    setErrors((x) => ({ ...x, maxResults: undefined }));
                  }}
                  aria-invalid={errors.maxResults ? true : undefined}
                  className="h-10 w-28 rounded-control bg-surface px-3 text-base text-ink tabular-nums ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest aria-invalid:ring-danger"
                />
              </label>
            </Collapse>
            {errors.maxResults && (
              <p role="alert" className="text-sm text-danger">
                {errors.maxResults}
              </p>
            )}
          </fieldset>

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

      <FilterGroup title="Filtreler" badge={active} defaultOpen={active > 0}>
        <FilterRow title="Web sitesi" hint="Yeni aramalar da bu seçime göre yapılır.">
          <FilterSegmented label="Web sitesi" options={[{ value: "var", label: "Var" }, { value: "yok", label: "Yok" }]} value={filters.web} onChange={setFilter("web")} counts={facets?.counts.web} />
        </FilterRow>
        <FilterRow title="Telefon numarası">
          <FilterSegmented label="Telefon numarası" options={[{ value: "var", label: "Var" }, { value: "yok", label: "Yok" }]} value={filters.tel} onChange={setFilter("tel")} counts={facets?.counts.tel} />
        </FilterRow>
        <FilterRow title="Genel skor">
          <FilterSegmented label="Genel skor" options={[{ value: 50, label: "50+" }, { value: 70, label: "70+" }, { value: 85, label: "85+" }]} value={filters.min} onChange={setFilter("min")} counts={facets?.counts.min} />
        </FilterRow>
        <FilterRow title="Dijital ihtiyaç">
          <FilterSegmented label="Dijital ihtiyaç" options={[{ value: 60, label: "60+" }, { value: 80, label: "80+" }]} value={filters.dn} onChange={setFilter("dn")} counts={facets?.counts.dn} />
        </FilterRow>
        <FilterRow title="Ulaşılabilirlik">
          <FilterSegmented label="Ulaşılabilirlik" options={[{ value: 60, label: "60+" }, { value: 80, label: "80+" }]} value={filters.rc} onChange={setFilter("rc")} counts={facets?.counts.rc} />
        </FilterRow>
        <FilterRow title="Google puanı">
          <FilterSegmented label="Google puanı" options={[{ value: 4, label: "4,0+" }, { value: 4.5, label: "4,5+" }]} value={filters.star} onChange={setFilter("star")} counts={facets?.counts.star} />
        </FilterRow>
        <FilterRow title="Yorum sayısı">
          <FilterSegmented label="Yorum sayısı" options={[{ value: 50, label: "50+" }, { value: 200, label: "200+" }, { value: 500, label: "500+" }]} value={filters.rev} onChange={setFilter("rev")} counts={facets?.counts.rev} />
        </FilterRow>
        {facets && (facets.districts.length > 1 || filters.d) && (
          <FilterRow title="Semt">
            <Select<string>
              label="Semt"
              value={filters.d ?? ""}
              options={[
                { value: "", label: `Tüm semtler (${facets.districtAll})` },
                ...facets.districts.map((d) => ({ value: d.name, label: `${d.name} (${d.count})` })),
                ...(filters.d && !facets.districts.some((d) => d.name === filters.d) ? [{ value: filters.d, label: filters.d }] : []),
              ]}
              onChange={(v) => setFilter("d")(v || undefined)}
            />
          </FilterRow>
        )}
        {active > 0 && (
          <button
            type="button"
            onClick={() => navigate((p) => filterKeys.forEach((k) => p.delete(k)))}
            className="justify-self-start rounded-control px-1 text-sm font-medium text-accent underline underline-offset-4 hover:no-underline"
          >
            Filtreleri temizle
          </button>
        )}
      </FilterGroup>

      {searches.length > 0 && (
        <FilterGroup title="Son aramalar" defaultOpen={false}>
          <ul className="-mx-2 grid gap-0.5">
            {searches.map((s) => (
              <li key={s.id} className="group relative" data-removing={removing === s.id}>
                <Link
                  href={`/panel/musteri-bul?s=${s.id}`}
                  aria-current={s.id === selectedId ? "true" : undefined}
                  onClick={(e) => {
                    // Ctrl/Cmd/orta tıklama yeni sekmede açar; düz tıklama animasyonla açılır.
                    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                    e.preventDefault();
                    if (s.id !== selectedId) onOpenSearch(s.id);
                  }}
                  className="grid gap-0.5 rounded-control py-2.5 pr-11 pl-3 hover:bg-sunken/60 aria-[current=true]:bg-forest-soft"
                >
                  <span className="truncate text-sm font-medium">{s.query} · {s.location}</span>
                  <span className="text-xs text-muted">
                    {statusLabel[s.status]}
                    {s.status === "done" ? ` · ${s.scored} firma` : ""}
                  </span>
                </Link>
                {!isActiveStatus(s.status) && (
                  <button
                    type="button"
                    onClick={() => removeSearch(s.id)}
                    disabled={removing === s.id}
                    aria-label={`${s.query} · ${s.location} aramasını sil`}
                    title="Aramayı sil"
                    className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted transition-colors hover:bg-line hover:text-danger disabled:opacity-40"
                  >
                    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                      <path d="m2.5 2.5 7 7m0-7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </FilterGroup>
      )}
    </div>
  );
}
