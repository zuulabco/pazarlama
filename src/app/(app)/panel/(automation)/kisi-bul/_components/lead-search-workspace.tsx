"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, SparkleIcon, TrashIcon } from "@/components/ui/icons";
import { isUnlimited } from "@/modules/outreach/plans";
import { Modal } from "@/components/ui/modal";
import { RotatingTips } from "@/components/ui/rotating-tips";
import { Segmented } from "@/components/ui/segmented";
import { ShapeLoader } from "@/components/ui/shape-loader";
import { Toaster, toast } from "@/components/ui/toast";
import { browseSizes, DEFAULT_COUNT, emptySearch, leadPresets, type LeadBrowse, type LeadPreset, type LeadSearchInput, type SavedSearch } from "@/modules/outreach/lead-options";
import type { AccountSummary } from "@/modules/outreach/usage";
import { api } from "../../kisiler/_components/contact-ui";
import { LeadAddModal } from "./lead-add-modal";
import { LeadFilters } from "./lead-filters";
import styles from "./ai-bar.module.css";
import { LeadMore } from "./lead-more";
import { LeadResults } from "./lead-results";

const tips = ["Filtrelerinize uyan kişiler aranıyor…", "Daha önce kaydedilen kişiler öne alınıyor…", "Kişiler profilinize göre puanlanıyor…", "Liste skora göre sıralanıyor…"];
const num = (n: number) => new Intl.NumberFormat("tr-TR").format(n);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const inputClass =
  "h-11 w-full min-w-0 rounded-control bg-surface px-3.5 ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest";

const filterKey = (x: LeadSearchInput) => JSON.stringify({ ...x, count: 0 });

type Stage = { kind: "idle" } | { kind: "running" } | { kind: "results"; search: LeadBrowse } | { kind: "failed"; message: string };

/**
 * Kişi bul (Instantly SuperSearch yapısı): solda filtreler, sağda başlangıç ekranı / sonuç tablosu.
 * Akış: ara (kredi düşmez) → satırları seç → "Kişileri ekle" (kişi başına 1 Spine Kredi) → otomasyona ekle.
 */
export function LeadSearchWorkspace({ initialAccount, defaultCountry, initialAsk = null }: { initialAccount: AccountSummary; defaultCountry: string; initialAsk?: string | null }) {
  const [account, setAccount] = useState(initialAccount);
  const [q, setQ] = useState<LeadSearchInput>(() => emptySearch(defaultCountry));
  const aiInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [aiText, setAiText] = useState(initialAsk ?? "");
  const askedOnce = useRef(false);
  const [aiBusy, setAiBusy] = useState(false);
  /** Son çalıştırılan aramanın filtre özeti: filtreler sonradan değişirse "yeniden ara" çubuğu çıkar. */
  const [searchedKey, setSearchedKey] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saved, setSaved] = useState<SavedSearch[] | null>(null);
  const alive = useRef(true);
  const searchId = useRef<string | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Adspine AI sohbetinden ("İstanbul'daki makine mühendislerini ara") gelindiyse arama kendiliğinden başlar.
  useEffect(() => {
    if (!initialAsk || askedOnce.current) return;
    askedOnce.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    const t = setTimeout(() => void askAi(initialAsk), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (patch: Partial<LeadSearchInput>) => setQ((cur) => ({ ...cur, ...patch }));
  const ready = q.roles.length + q.titles.length + q.industries.length + q.keywords.length > 0;
  const left = account.browse.left;
  const sizes = browseSizes.filter((s) => s <= left);
  const size = sizes.includes(q.count as (typeof browseSizes)[number]) ? q.count : (sizes.at(-1) ?? browseSizes[0]);
  const activeCount =
    (q.roles.length ? 1 : 0) + (q.titles.length ? 1 : 0) + (q.notTitles.length ? 1 : 0) + (q.city?.trim() ? 1 : 0) + (q.country !== defaultCountry ? 1 : 0) + (q.industries.length ? 1 : 0) + (q.sizes.length ? 1 : 0) + (q.keywords.length ? 1 : 0) + (q.notKeywords.length ? 1 : 0);

  async function refreshAccount() {
    const r = await api<{ account: AccountSummary }>("/api/outreach/account");
    if (r.ok) setAccount(r.data.account);
  }

  /** Aramayı başlatır ve hazır olana kadar yoklar. */
  async function run(query: LeadSearchInput = q) {
    if (busy) return;
    setBusy(true);
    setSearchedKey(filterKey(query));
    setSelected(new Set());
    // Arama isteği beklenirken de yükleme ekranı gösterilir (aksi hâlde kısa bir süre "kaç kişi" çubuğu görünürdü).
    const before = stage;
    setStage({ kind: "running" });
    const r = await api<{ search: LeadBrowse }>("/api/outreach/leads/browse", { method: "POST", body: JSON.stringify({ ...query, city: query.city?.trim() || undefined, count: query.count }) });
    if (!r.ok) {
      setBusy(false);
      setStage(before.kind === "running" ? { kind: "idle" } : before);
      return toast(r.error, { kind: "error" });
    }
    await poll(r.data.search.id);
  }

  /** Aramanın bitmesini bekler (sunucu her yoklamada bir adım ilerletir) ve sonucu gösterir. */
  async function poll(id: string) {
    searchId.current = id;
    setStage({ kind: "running" });
    for (let i = 0; i < 150 && alive.current; i++) {
      await sleep(i < 4 ? 2000 : 3000);
      if (!alive.current || searchId.current !== id) return;
      const s = await api<{ search: LeadBrowse }>(`/api/outreach/leads/browse/${id}`);
      if (!s.ok || s.data.search.status === "calisiyor") continue;
      setBusy(false);
      void refreshAccount();
      return setStage(s.data.search.status === "hazir" ? { kind: "results", search: s.data.search } : { kind: "failed", message: s.data.search.error ?? "Arama tamamlanamadı." });
    }
    setBusy(false);
    setStage({ kind: "failed", message: "Arama beklenenden uzun sürdü. Biraz sonra tekrar deneyin." });
  }

  /** Hazır listeye daha fazla kişi ekler (zaten listelenenler hariç); seçimler korunur. */
  async function more(count: number) {
    if (busy || stage.kind !== "results") return;
    setBusy(true);
    const r = await api<{ search: LeadBrowse }>(`/api/outreach/leads/browse/${stage.search.id}/more`, { method: "POST", body: JSON.stringify({ count }) });
    if (!r.ok) {
      setBusy(false);
      return toast(r.error, { kind: "error" });
    }
    await poll(r.data.search.id);
  }

  async function askAi(textArg: string = aiText) {
    if (aiBusy || textArg.trim().length < 4) return;
    setAiBusy(true);
    const r = await api<{ filters: Partial<LeadSearchInput> }>("/api/outreach/leads/ai", { method: "POST", body: JSON.stringify({ text: textArg }) });
    setAiBusy(false);
    if (!r.ok) return toast(r.error, { kind: "error" });
    // Filtreler hazırsa arama kendiliğinden başlar: varsayılan ${DEFAULT_COUNT} kişi (hakkınız azsa o kadar); sonuçtan sonra "Daha fazla listele" vardır.
    const count = Math.min(DEFAULT_COUNT, left);
    const next = { ...emptySearch(defaultCountry), ...r.data.filters, count };
    setQ(next);
    if (next.roles.length + next.titles.length + next.industries.length + next.keywords.length === 0) return toast("İsteğinizden bir filtre çıkarılamadı. Biraz daha ayrıntı yazın ya da filtreleri soldan seçin.", { kind: "error" });
    if (count < 5) return toast("Listeleme hakkınız doldu.", { kind: "error" });
    void run(next);
  }

  /** Sonuç çıkmadıysa sunulan seçenekler (yalnızca veri): her biri belirli bir filtreyi kaldırır. */
  const relaxList: { key: "unvan" | "sektor" | "sehir"; label: string }[] = [];
  if (q.roles.length + q.titles.length > 0) relaxList.push({ key: "unvan", label: "Unvan filtresi olmadan ara" });
  if (q.industries.length + q.sizes.length + q.keywords.length + q.notKeywords.length > 0) relaxList.push({ key: "sektor", label: "Sektör ve kelime filtreleri olmadan ara" });
  if (q.city?.trim()) relaxList.push({ key: "sehir", label: "Şehir yerine tüm ülkede ara" });

  /** Seçilen filtreyi kaldırıp aynı aramayı yeniden çalıştırır. */
  function relax(key: "unvan" | "sektor" | "sehir") {
    const next: LeadSearchInput =
      key === "unvan" ? { ...q, roles: [], titles: [] } : key === "sektor" ? { ...q, industries: [], sizes: [], keywords: [], notKeywords: [] } : { ...q, city: undefined };
    setQ(next);
    void run(next);
  }

  /** Hazır aramaya tıklamak yalnızca metni kutuya yazar; göndermek (Enter) kullanıcıya kalır. */
  function preset(p: LeadPreset) {
    setAiText(p.prompt);
    aiInput.current?.focus();
  }

  async function openLoad() {
    setLoadOpen(true);
    const r = await api<{ searches: SavedSearch[] }>("/api/outreach/leads/saved");
    if (r.ok) setSaved(r.data.searches);
  }

  async function save() {
    if (!saveName.trim() || busy) return;
    const r = await api<{ search: SavedSearch }>("/api/outreach/leads/saved", { method: "POST", body: JSON.stringify({ name: saveName.trim(), query: { ...q, city: q.city?.trim() || undefined } }) });
    if (!r.ok) return toast(r.error, { kind: "error" });
    toast("Arama kaydedildi");
    setSaveOpen(false);
    setSaveName("");
  }

  async function removeSaved(id: string) {
    const r = await api(`/api/outreach/leads/saved/${id}`, { method: "DELETE" });
    if (!r.ok) return toast(r.error, { kind: "error" });
    setSaved((s) => s?.filter((x) => x.id !== id) ?? null);
  }

  const searching = stage.kind === "running";
  const unlimited = isUnlimited(account.plan);
  const dirty = (stage.kind === "results" || stage.kind === "failed") && searchedKey !== null && searchedKey !== filterKey(q);
  /** Kaç kişi + Ara çubuğu: yalnızca henüz arama yapılmamışken filtreler hazırsa ya da filtreler sonradan değiştiyse görünür. */
  const showBar = (stage.kind === "idle" && ready) || dirty;
  const idle = stage.kind === "idle";
  /** Tek sayaç: yalnızca başlangıç ekranında; sonuç ekranında kalan hak "Daha fazla listele" kutusunda gösterilir. */
  const usage = (
    <p className="text-sm text-muted">
      {unlimited ? (
        <>
          Bu ay <span className="font-medium tabular-nums text-ink">{num(account.browse.used)}</span> kişi listelediniz · Listeleme ve Spine Kredi sınırsız ({account.plan.label} planı).
        </>
      ) : (
        <>
          Bu ay <span className="font-medium tabular-nums text-ink">{num(account.browse.used)}</span> / {num(account.browse.limit)} kişi listelediniz · Kalan Spine Kredi: <span className="font-medium tabular-nums text-ink">{num(account.credits)}</span> ({account.plan.label} planı).
        </>
      )}
    </p>
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <Toaster />
      <LeadFilters
        q={q}
        set={set}
        defaultCountry={defaultCountry}
        onClear={() => setQ({ ...emptySearch(defaultCountry), count: q.count })}
        onSave={() => setSaveOpen(true)}
        onLoad={() => void openLoad()}
        onSearch={() => void run({ ...q, count: size })}
        searching={busy}
        canSearch={ready && sizes.length > 0}
        activeCount={activeCount}
      />

      <section aria-label="Arama" className="order-first grid min-h-[28rem] content-start gap-5 rounded-panel bg-surface p-5 ring-1 ring-line sm:p-6 lg:order-none">
        {/* Adspine AI kutusu: her aşamada görünür (başlangıçta büyük, sonrasında ince); çalışırken marka renklerinde ışık geçişi. */}
        <div className={idle ? "mx-auto grid w-full max-w-3xl gap-6 pt-8 sm:pt-16" : "grid"}>
          {idle && <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Kimi bulmak istiyorsunuz?</h2>}
          <div className={styles.frame} data-busy={aiBusy || searching}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void askAi();
              }}
              className="flex items-center gap-2 rounded-full bg-surface p-2 pl-5"
            >
              <span className="shrink-0 text-accent">
                <SparkleIcon size={20} />
              </span>
              <label className="sr-only" htmlFor="ai-arama">
                Kimi aradığınızı yazın
              </label>
              <input
                ref={aiInput}
                id="ai-arama"
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                readOnly={aiBusy}
                maxLength={400}
                placeholder="Örn. İstanbul'daki 10-50 çalışanlı ajansların kurucuları"
                className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                disabled={aiBusy || busy || aiText.trim().length < 4}
                aria-label={aiBusy ? "Filtreler hazırlanıyor" : "Filtreleri hazırla ve ara"}
                title="Adspine AI ile ara"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-forest text-white transition-colors hover:bg-forest-hover disabled:opacity-40"
              >
                {aiBusy ? <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <ArrowRightIcon size={18} />}
              </button>
            </form>
          </div>
          {idle && (
            <>
              <ul className="flex flex-wrap justify-center gap-2">
                {leadPresets.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => preset(p)} className="h-9 rounded-full px-4 text-sm font-medium ring-1 ring-line-strong ring-inset transition-colors hover:bg-forest-soft/60 hover:ring-forest/50">
                      {p.label}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="grid justify-items-center text-center">{usage}</div>
            </>
          )}
        </div>

        {showBar && (
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 rounded-row bg-sunken/60 p-4">
            <div className="grid gap-1.5 text-sm font-medium">
              {dirty ? "Filtreleri değiştirdiniz: kaç kişi listelensin? Sonra sol alttaki \"Müşteri bul\"a basın." : "Listelenecek kişi"}
              {sizes.length > 0 ? <Segmented label="Listelenecek kişi sayısı" items={sizes.map((s) => ({ key: String(s), label: String(s), pressed: size === s, onClick: () => set({ count: s }) }))} /> : <span className="text-sm font-normal text-danger">Bugünkü listeleme hakkınız doldu.</span>}
            </div>
          </div>
        )}

        <div aria-live="polite">
          {searching && (
            <div role="status" className="grid min-h-[20rem] content-center justify-items-center gap-7 text-center">
              <ShapeLoader />
              <RotatingTips tips={tips} label={null} />
            </div>
          )}

          {stage.kind === "failed" && (
            <div className="grid gap-3">
              <p role="alert" className="text-danger">
                {stage.message}
              </p>
              <Button variant="secondary" className="w-fit" onClick={() => setStage({ kind: "idle" })}>
                Yeniden dene
              </Button>
            </div>
          )}

          {stage.kind === "results" && (
            <LeadResults
              search={stage.search}
              selected={selected}
              onToggle={(rid) =>
                setSelected((cur) => {
                  const n = new Set(cur);
                  if (!n.delete(rid)) n.add(rid);
                  return n;
                })
              }
              onToggleAll={(all) => setSelected(all ? new Set(stage.search.rows.filter((r) => !r.owned).map((r) => r.rid)) : new Set())}
              onAdd={() => setAddOpen(true)}
              relaxOptions={relaxList}
              onRelax={relax}
            />
          )}
          {stage.kind === "results" && (
            <div className="mt-5">
              <LeadMore left={account.browse.left} unlimited={unlimited} busy={busy} onMore={(c) => void more(c)} />
            </div>
          )}
        </div>
      </section>

      {stage.kind === "results" && (
        <LeadAddModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          searchId={stage.search.id}
          rids={[...selected]}
          credits={account.credits}
          onDone={(credits) => setAccount((a) => ({ ...a, credits }))}
        />
      )}

      <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title="Aramayı kaydet" width="28rem">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="grid gap-4"
        >
          <label className="grid gap-1.5 text-sm font-medium">
            Arama adı
            <input value={saveName} onChange={(e) => setSaveName(e.target.value)} maxLength={80} placeholder="Örn. İstanbul pazarlama müdürleri" className={inputClass} autoFocus />
            <span className="text-sm font-normal text-muted">Yalnızca filtreler kaydedilir; sonuçlar kaydedilmez.</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="quiet" onClick={() => setSaveOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={!saveName.trim()}>
              Kaydet
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={loadOpen} onClose={() => setLoadOpen(false)} title="Kayıtlı aramalar" width="30rem">
        {saved === null ? (
          <p className="text-sm text-muted">Yükleniyor…</p>
        ) : saved.length === 0 ? (
          <p className="text-sm text-muted">Henüz kayıtlı aramanız yok. Filtreleri seçip “Kaydet”e basın.</p>
        ) : (
          <ul className="grid gap-2">
            {saved.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQ({ ...emptySearch(defaultCountry), ...s.query });
                    setStage({ kind: "idle" });
                    setLoadOpen(false);
                    toast(`“${s.name}” yüklendi`);
                  }}
                  className="grid min-w-0 flex-1 gap-0.5 rounded-row p-3 text-left ring-1 ring-line-strong ring-inset transition-colors hover:bg-forest-soft/60"
                >
                  <span className="truncate font-medium">{s.name}</span>
                </button>
                <button type="button" onClick={() => void removeSaved(s.id)} aria-label={`${s.name} aramasını sil`} className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-danger">
                  <TrashIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
