"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchIcon, SparkleIcon, TrashIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { RotatingTips } from "@/components/ui/rotating-tips";
import { Segmented } from "@/components/ui/segmented";
import { ShapeLoader } from "@/components/ui/shape-loader";
import { Toaster, toast } from "@/components/ui/toast";
import { browseSizes, emptySearch, leadPresets, type LeadBrowse, type LeadPreset, type LeadSearchInput, type SavedSearch } from "@/modules/outreach/lead-options";
import type { AccountSummary } from "@/modules/outreach/usage";
import { api } from "../../kisiler/_components/contact-ui";
import { LeadAddModal } from "./lead-add-modal";
import { LeadFilters } from "./lead-filters";
import { LeadResults } from "./lead-results";

const tips = ["Filtrelerinize uyan kişiler taranıyor…", "Unvan, şirket ve konum bilgileri toplanıyor…", "Aynı şirketten tekrarlar ayıklanıyor…", "Sonuçlar hazırlanıyor…"];
const num = (n: number) => new Intl.NumberFormat("tr-TR").format(n);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const inputClass =
  "h-11 w-full min-w-0 rounded-control bg-surface px-3.5 ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest";

type Stage = { kind: "idle" } | { kind: "running" } | { kind: "results"; search: LeadBrowse } | { kind: "failed"; message: string };

/**
 * Kişi bul (Instantly SuperSearch yapısı): solda filtreler, sağda başlangıç ekranı / sonuç tablosu.
 * Akış: ara (kredi düşmez) → satırları seç → "Kişileri ekle" (kişi başına 1 Spine Kredi) → otomasyona ekle.
 */
export function LeadSearchWorkspace({ initialAccount }: { initialAccount: AccountSummary }) {
  const [account, setAccount] = useState(initialAccount);
  const [q, setQ] = useState<LeadSearchInput>(emptySearch);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [skipOwned, setSkipOwned] = useState(true);
  const [oneLead, setOneLead] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
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

  const set = (patch: Partial<LeadSearchInput>) => setQ((cur) => ({ ...cur, ...patch }));
  const ready = q.roles.length + q.titles.length + q.industries.length + q.keywords.length > 0;
  const left = account.browse.left;
  const sizes = browseSizes.filter((s) => s <= left);
  const size = sizes.includes(q.count as (typeof browseSizes)[number]) ? q.count : (sizes.at(-1) ?? browseSizes[0]);
  const activeCount =
    (q.roles.length ? 1 : 0) + (q.titles.length ? 1 : 0) + (q.notTitles.length ? 1 : 0) + (q.city?.trim() ? 1 : 0) + (q.country !== "turkey" ? 1 : 0) + (q.industries.length ? 1 : 0) + (q.sizes.length ? 1 : 0) + (q.keywords.length ? 1 : 0) + (q.notKeywords.length ? 1 : 0);

  const params = (o = skipOwned, l = oneLead) => `skipOwned=${o ? 1 : 0}&oneLead=${l ? 1 : 0}`;

  async function refreshAccount() {
    const r = await api<{ account: AccountSummary }>("/api/outreach/account");
    if (r.ok) setAccount(r.data.account);
  }

  /** Aramayı başlatır ve hazır olana kadar yoklar. */
  async function run(query: LeadSearchInput = q) {
    if (busy) return;
    setBusy(true);
    setSelected(new Set());
    const r = await api<{ search: LeadBrowse }>("/api/outreach/leads/browse", { method: "POST", body: JSON.stringify({ ...query, city: query.city?.trim() || undefined, count: query.count }) });
    if (!r.ok) {
      setBusy(false);
      return toast(r.error, { kind: "error" });
    }
    searchId.current = r.data.search.id;
    setStage({ kind: "running" });
    for (let i = 0; i < 150 && alive.current; i++) {
      await sleep(i < 4 ? 2000 : 3000);
      if (!alive.current || searchId.current !== r.data.search.id) return;
      const s = await api<{ search: LeadBrowse }>(`/api/outreach/leads/browse/${r.data.search.id}?${params()}`);
      if (!s.ok || s.data.search.status === "calisiyor") continue;
      setBusy(false);
      void refreshAccount();
      return setStage(s.data.search.status === "hazir" ? { kind: "results", search: s.data.search } : { kind: "failed", message: s.data.search.error ?? "Arama tamamlanamadı." });
    }
    setBusy(false);
    setStage({ kind: "failed", message: "Arama beklenenden uzun sürdü. Biraz sonra tekrar deneyin." });
  }

  /** Anahtarlar değişince aynı arama yeniden süzülür (sağlayıcıya gidilmez, hızlıdır). */
  async function reload(o: boolean, l: boolean) {
    if (stage.kind !== "results") return;
    const s = await api<{ search: LeadBrowse }>(`/api/outreach/leads/browse/${stage.search.id}?${params(o, l)}`);
    if (s.ok) {
      setStage({ kind: "results", search: s.data.search });
      setSelected(new Set());
    }
  }

  async function askAi() {
    if (aiBusy || aiText.trim().length < 4) return;
    setAiBusy(true);
    const r = await api<{ filters: Partial<LeadSearchInput> }>("/api/outreach/leads/ai", { method: "POST", body: JSON.stringify({ text: aiText }) });
    setAiBusy(false);
    if (!r.ok) return toast(r.error, { kind: "error" });
    const next = { ...emptySearch(), ...r.data.filters, count: size };
    setQ(next);
    toast("Filtreler hazırlandı");
    if (next.roles.length + next.titles.length + next.industries.length + next.keywords.length > 0) void run(next);
    else toast("İsteğinizden bir filtre çıkarılamadı. Filtreleri soldan seçin.", { kind: "error" });
  }

  function preset(p: LeadPreset) {
    const next = { ...emptySearch(), ...p.query, count: size };
    setQ(next);
    void run(next);
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

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <Toaster />
      <LeadFilters
        q={q}
        set={set}
        skipOwned={skipOwned}
        oneLead={oneLead}
        onSkipOwned={(v) => {
          setSkipOwned(v);
          void reload(v, oneLead);
        }}
        onOneLead={(v) => {
          setOneLead(v);
          void reload(skipOwned, v);
        }}
        onClear={() => setQ({ ...emptySearch(), count: q.count })}
        onSave={() => setSaveOpen(true)}
        onLoad={() => void openLoad()}
        activeCount={activeCount}
      />

      <section aria-label="Arama" className="order-first grid min-h-[28rem] content-start gap-5 rounded-panel bg-surface p-5 ring-1 ring-line sm:p-6 lg:order-none">
        {/* Eylem çubuğu: kaç kişi listelensin ve ara. */}
        <div className="grid gap-2 border-b border-line pb-5">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="grid gap-1.5 text-sm font-medium">
              Listelenecek kişi
              {sizes.length > 0 ? <Segmented label="Listelenecek kişi sayısı" items={sizes.map((s) => ({ key: String(s), label: String(s), pressed: size === s, onClick: () => set({ count: s }) }))} /> : <span className="text-sm font-normal text-danger">Bugünkü listeleme hakkınız doldu.</span>}
            </div>
            <Button onClick={() => void run({ ...q, count: size })} disabled={!ready || busy || sizes.length === 0}>
              <SearchIcon size={16} />
              {searching ? "Aranıyor…" : "Ara"}
            </Button>
          </div>
          <p className="text-sm text-muted">
            Bu ay <span className="font-medium tabular-nums text-ink">{num(account.browse.used)}</span> / {num(account.browse.limit)} kişi listelediniz · Kalan Spine Kredi:{" "}
            <span className="font-medium tabular-nums text-ink">{num(account.credits)}</span> ({account.plan.label} paketi).
          </p>
          {!ready && stage.kind === "idle" && <p className="text-sm text-muted">Aramak için soldan bir unvan, kişi türü, sektör ya da anahtar kelime seçin.</p>}
        </div>

        <div aria-live="polite">
          {stage.kind === "idle" && (
            <div className="grid gap-7">
              <div className="grid gap-4">
                <h2 className="text-2xl font-semibold tracking-tight">Yeni arama başlatın</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void askAi();
                  }}
                  className="flex flex-wrap gap-2"
                >
                  <label className="sr-only" htmlFor="ai-arama">
                    Kimi aradığınızı yazın
                  </label>
                  <input id="ai-arama" value={aiText} onChange={(e) => setAiText(e.target.value)} maxLength={400} placeholder="Örn. İstanbul'daki 10-50 çalışanlı ajansların kurucuları" className={`${inputClass} min-w-[16rem] flex-1`} />
                  <Button type="submit" variant="secondary" disabled={aiBusy || aiText.trim().length < 4}>
                    <SparkleIcon size={16} />
                    {aiBusy ? "Hazırlanıyor…" : "Adspine AI ile ara"}
                  </Button>
                </form>
              </div>

              <ul className="grid gap-3 sm:grid-cols-3">
                <li className="grid gap-1 rounded-row bg-forest-soft/50 p-4 ring-1 ring-forest/30">
                  <span className="font-medium">Veritabanında ara</span>
                  <span className="text-sm text-muted">Unvan, kıdem, konum ve şirket filtreleriyle ya da Adspine AI ile.</span>
                </li>
                <li>
                  <Link href="/panel/musteri-bul" className="grid h-full gap-1 rounded-row p-4 ring-1 ring-line-strong ring-inset transition-colors hover:bg-sunken/60">
                    <span className="font-medium">Şirketlerden başla</span>
                    <span className="text-sm text-muted">Google Haritalar&apos;dan işletmeleri bulun, sonra e-postalarını edinin.</span>
                  </Link>
                </li>
                <li>
                  <Link href="/panel/kisiler" className="grid h-full gap-1 rounded-row p-4 ring-1 ring-line-strong ring-inset transition-colors hover:bg-sunken/60">
                    <span className="font-medium">Kendi listenizi getirin</span>
                    <span className="text-sm text-muted">CSV yükleyin, kayıtlı firmalarınızdan ekleyin ya da elle yazın.</span>
                  </Link>
                </li>
              </ul>

              <div className="grid gap-2.5">
                <h3 className="text-sm font-medium">Hazır aramalar</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {leadPresets.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => preset(p)} disabled={busy || sizes.length === 0} className="grid w-full gap-0.5 rounded-row p-3.5 text-left ring-1 ring-line-strong ring-inset transition-colors hover:bg-forest-soft/60 hover:ring-forest/50 disabled:opacity-50">
                        <span className="font-medium">{p.label}</span>
                        <span className="text-sm text-muted">{p.hint}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

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
            />
          )}
        </div>
      </section>

      {stage.kind === "results" && (
        <LeadAddModal
          open={addOpen}
          onClose={() => {
            setAddOpen(false);
            void reload(skipOwned, oneLead);
          }}
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
                    setQ({ ...emptySearch(), ...s.query });
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
