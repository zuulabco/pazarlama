"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { DownloadIcon, MailIcon, PenIcon, PlusIcon, SearchIcon, SparkleIcon, TrashIcon, UsersIcon } from "@/components/ui/icons";
import { RowMenu, type RowMenuItem } from "@/components/ui/row-menu";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { toast, Toaster } from "@/components/ui/toast";
import { toCsv } from "@/modules/outreach/csv";
import type { ContactList, Suppression } from "@/modules/outreach/contacts";
import { statusLabels, type EmailStatus } from "@/modules/outreach/discover/verify-rules";
import type { Contact } from "@/modules/outreach/schema";
import { ContactForm, blankContact, draftOf, type ContactDraft } from "./contact-form";
import { KindChip, StatusChip, api, download, sourceLabels } from "./contact-ui";
import type { AccountSummary } from "@/modules/outreach/usage";
import { CsvPanel } from "./csv-panel";
import { ListsView, SuppressionsView } from "./side-views";
import { ContactRowsSkeleton } from "../../../../_components/skeletons";

type View = "kisiler" | "listeler" | "kara-liste";
type Panel = { mode: "new" } | { mode: "edit"; contact: Contact } | { mode: "csv" } | null;
type Filters = { q: string; status: string; kind: string; list: string; page: number };
type Run = { done: number; total: number; found: number };

const PER_PAGE = 25;
const defaults: Filters = { q: "", status: "hepsi", kind: "hepsi", list: "", page: 1 };

const statusOptions = [{ value: "hepsi", label: "Tüm durumlar" }, ...(Object.keys(statusLabels) as EmailStatus[]).map((s) => ({ value: s, label: statusLabels[s] }))];
const kindOptions = [
  { value: "hepsi", label: "Tüm adres türleri" },
  { value: "is", label: "İş adresi" },
  { value: "rol", label: "Ortak adres (info@…)" },
  { value: "kisisel", label: "Kişisel adres (gmail…)" },
];

const initialsOf = (c: Contact) =>
  (c.name ?? c.company ?? c.email ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toLocaleUpperCase("tr");
const hostOf = (url: string | null) => (url ? url.replace(/^https?:\/\/(www\.)?/, "").replace(/[/?#].*$/, "") : null);

/** İkinci-sınıf: bir kişiye e-posta bulma gerekli mi? (adres yok/geçersiz/doğrulanamamış ve web sitesi var) */
const canFind = (c: Contact) => Boolean(c.website) && (!c.email || c.emailStatus === "gecersiz" || c.emailStatus === "riskli");

/** Kişiler: tablo, filtreler, e-posta bulma, listeler, kara liste, CSV içe/dışa aktarma. */
export function ContactsWorkspace({
  initialContacts,
  initialTotal,
  initialLists,
  initialSuppressions,
  initialAccount,
  unavailable,
}: {
  initialContacts: Contact[];
  initialTotal: number;
  initialLists: ContactList[];
  initialSuppressions: Suppression[];
  initialAccount: AccountSummary | null;
  unavailable: boolean;
}) {
  const [view, setView] = useState<View>("kisiler");
  const [contacts, setContacts] = useState(initialContacts);
  const [total, setTotal] = useState(initialTotal);
  const [lists, setLists] = useState(initialLists);
  const [suppressions, setSuppressions] = useState(initialSuppressions);
  const [filters, setFilters] = useState<Filters>(defaults);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(false);
  /** Yükleme 150 ms'den uzun sürerse iskelet gösterilir; daha kısa yüklemelerde liste olduğu gibi kalır (yanıp sönme yok). */
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setSlow(true), 150);
    return () => {
      clearTimeout(t);
      setSlow(false);
    };
  }, [loading]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [panel, setPanel] = useState<Panel>(null);
  const account = initialAccount;
  const [draft, setDraft] = useState<ContactDraft>(blankContact);
  const [saving, setSaving] = useState(false);
  const [finding, setFinding] = useState<Set<string>>(new Set());
  const [run, setRun] = useState<Run | null>(null);
  const [newList, setNewList] = useState<string | null>(null);
  const cancel = useRef(false);
  const seq = useRef(0);
  const firstLoad = useRef(true);

  const refetch = useCallback(() => setReload((n) => n + 1), []);

  const loadLists = useCallback(async () => {
    const r = await api<{ lists: ContactList[] }>("/api/outreach/lists");
    if (r.ok) setLists(r.data.lists);
  }, []);
  const loadSuppressions = useCallback(async () => {
    const r = await api<{ suppressions: Suppression[] }>("/api/outreach/suppressions");
    if (r.ok) setSuppressions(r.data.suppressions);
  }, []);

  // Filtre/sayfa değişince (yazarken kısa gecikmeyle) kişileri yeniden çeker; sonuç sırası bozulursa eski yanıt atılır.
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      if (reload === 0 && filters === defaults) return;
    }
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const q = new URLSearchParams({ status: filters.status, kind: filters.kind, page: String(filters.page) });
      if (filters.q.trim()) q.set("q", filters.q.trim());
      if (filters.list) q.set("list", filters.list);
      const r = await api<{ contacts: Contact[]; total: number }>(`/api/outreach/contacts?${q}`);
      if (mine !== seq.current) return;
      setLoading(false);
      if (!r.ok) return toast(r.error, { kind: "error" });
      setContacts(r.data.contacts);
      setTotal(r.data.total);
      setSelected(new Set());
    }, filters.q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [filters, reload]);

  const patch = (next: Partial<Filters>) => setFilters((f) => ({ ...f, page: 1, ...next }));
  const replace = (c: Contact) => setContacts((prev) => prev.map((x) => (x.id === c.id ? c : x)));

  // ─── Kişi ekle / düzenle ────────────────────────────────────────────────────
  const openNew = () => {
    setDraft(blankContact);
    setPanel({ mode: "new" });
  };
  const openEdit = (c: Contact) => {
    setDraft(draftOf(c));
    setPanel({ mode: "edit", contact: c });
  };

  async function save() {
    if (!panel || panel.mode === "csv" || saving) return;
    setSaving(true);
    const body = JSON.stringify(draft);
    const r =
      panel.mode === "edit"
        ? await api<{ contact: Contact }>(`/api/outreach/contacts/${panel.contact.id}`, { method: "PATCH", body })
        : await api<{ contact: Contact }>("/api/outreach/contacts", { method: "POST", body });
    setSaving(false);
    if (!r.ok) return toast(r.error, { kind: "error" });
    toast(panel.mode === "edit" ? "Kişi güncellendi" : "Kişi eklendi");
    setPanel(null);
    refetch();
  }

  // ─── E-posta bulma ──────────────────────────────────────────────────────────
  async function findOne(id: string): Promise<{ found: boolean } | null> {
    setFinding((s) => new Set(s).add(id));
    let r = await api<{ contact: Contact; found: boolean }>(`/api/outreach/contacts/${id}/discover`, { method: "POST" });
    if (!r.ok && r.status === 429) {
      await new Promise((res) => setTimeout(res, 5000));
      r = await api<{ contact: Contact; found: boolean }>(`/api/outreach/contacts/${id}/discover`, { method: "POST" });
    }
    setFinding((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    if (!r.ok) {
      toast(r.error, { kind: "error" });
      return null;
    }
    if (r.data.contact) {
      replace(r.data.contact);
      setPanel((p) => (p?.mode === "edit" && p.contact.id === id ? { mode: "edit", contact: r.data.contact } : p));
      setDraft((d) => (panel?.mode === "edit" && panel.contact.id === id ? { ...d, email: r.data.contact.email ?? "" } : d));
    }
    return { found: r.data.found };
  }

  /** Birkaç kişiyi aynı anda (3 eşzamanlı istek) tarar; ilerleme çubuğu gösterir, iptal edilebilir. */
  async function findMany(ids: string[]) {
    if (ids.length === 0 || run) return;
    cancel.current = false;
    let done = 0;
    let found = 0;
    setRun({ done: 0, total: ids.length, found: 0 });
    const queue = [...ids];
    const worker = async () => {
      while (queue.length > 0 && !cancel.current) {
        const id = queue.shift()!;
        const res = await findOne(id);
        done++;
        if (res?.found) found++;
        setRun({ done, total: ids.length, found });
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setRun(null);
    toast(cancel.current ? `Tarama durduruldu: ${found} e-posta bulundu` : `${ids.length} kişi tarandı, ${found} e-posta bulundu`);
    refetch();
  }

  async function findSelected() {
    const ids = contacts.filter((c) => selected.has(c.id) && canFind(c)).map((c) => c.id);
    if (ids.length === 0) return toast("Seçilenlerde taranacak kişi yok (web sitesi olmalı, e-postası olmamalı).", { kind: "error" });
    await findMany(ids);
  }

  /** E-postası olmayan ve web sitesi olan ilk 100 kişiyi (tüm sayfalardan) tarar. */
  async function findAllMissing() {
    const r = await api<{ contacts: Contact[] }>("/api/outreach/contacts?status=yok&page=1");
    if (!r.ok) return toast(r.error, { kind: "error" });
    const ids = r.data.contacts.filter(canFind).map((c) => c.id);
    if (ids.length === 0) return toast("Taranacak kişi yok: e-postası olmayan ve web sitesi olan kişi bulunamadı.");
    await findMany(ids);
  }

  // ─── Toplu işlemler ─────────────────────────────────────────────────────────
  async function removeSelected() {
    const ids = [...selected];
    const r = await api<{ ok: true }>("/api/outreach/contacts", { method: "DELETE", body: JSON.stringify({ ids }) });
    if (!r.ok) return toast(r.error, { kind: "error" });
    toast(`${ids.length} kişi silindi`);
    refetch();
    void loadLists();
  }

  async function removeOne(c: Contact) {
    const r = await api<{ ok: true }>("/api/outreach/contacts", { method: "DELETE", body: JSON.stringify({ ids: [c.id] }) });
    if (!r.ok) return toast(r.error, { kind: "error" });
    toast("Kişi silindi");
    refetch();
    void loadLists();
  }

  async function addSelectedToList(listId: string) {
    const r = await api<{ added: number }>(`/api/outreach/lists/${listId}/members`, { method: "POST", body: JSON.stringify({ contactIds: [...selected] }) });
    if (!r.ok) return toast(r.error, { kind: "error" });
    toast(`${r.data.added} kişi listeye eklendi`);
    refetch();
    void loadLists();
  }

  async function createListAndAdd(name: string) {
    const c = await api<{ list: ContactList }>("/api/outreach/lists", { method: "POST", body: JSON.stringify({ name }) });
    if (!c.ok) return toast(c.error, { kind: "error" });
    setNewList(null);
    await addSelectedToList(c.data.list.id);
  }

  function exportSelected() {
    const rows = contacts.filter((c) => selected.size === 0 || selected.has(c.id));
    download(
      "kisiler.csv",
      toCsv(["Firma", "Ad", "Unvan", "E-posta", "E-posta durumu", "Telefon", "Web sitesi", "Şehir", "Kaynak"], rows.map((c) => [c.company ?? "", c.name ?? "", c.jobTitle ?? "", c.email ?? "", statusLabels[c.emailStatus], c.phone ?? "", c.website ?? "", c.city ?? "", sourceLabels[c.source]])),
    );
  }

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const allSelected = contacts.length > 0 && contacts.every((c) => selected.has(c.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(contacts.map((c) => c.id)));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });
  const withEmail = contacts.filter((c) => c.email && c.emailStatus !== "gecersiz").length;
  const filtered = filters.q || filters.status !== "hepsi" || filters.kind !== "hepsi" || filters.list;

  if (unavailable) {
    return (
      <div role="status" className="grid justify-items-center gap-3 rounded-panel bg-surface px-6 py-16 text-center ring-1 ring-line">
        <Toaster />
        <p className="text-lg font-semibold tracking-tight">Otomasyon henüz etkinleştirilmedi</p>
        <p className="max-w-[30rem] text-muted">Kişiler için veritabanı güncellemesi gerekiyor. Kısa süre sonra tekrar deneyin.</p>
      </div>
    );
  }

  const menuFor = (c: Contact): RowMenuItem[] => [
    { label: "Düzenle", icon: <PenIcon size={16} />, onClick: () => openEdit(c) },
    ...(canFind(c) ? [{ label: "E-posta bul", icon: <SearchIcon size={16} />, onClick: () => void findOne(c.id) }] : []),
    ...(c.email ? [{ label: "E-postayı kopyala", icon: <MailIcon size={16} />, onClick: () => void navigator.clipboard.writeText(c.email!).then(() => toast("Kopyalandı")) }] : []),
    { label: "Sil", icon: <TrashIcon size={16} />, danger: true, separatorBefore: true, onClick: () => void removeOne(c) },
  ];

  const emailCell = (c: Contact) =>
    c.email ? (
      <div className="grid gap-1">
        <span className="truncate">{c.email}</span>
        <span className="flex flex-wrap gap-1.5">
          <StatusChip status={c.emailStatus} />
          <KindChip kind={c.emailKind} />
        </span>
      </div>
    ) : (
      <div className="grid justify-items-start gap-1">
        <StatusChip status="yok" />
        {c.discoveryNote && <span className="max-w-[14rem] truncate text-xs text-muted">{c.discoveryNote}</span>}
      </div>
    );

  const findButton = (c: Contact) =>
    canFind(c) ? (
      <button
        type="button"
        onClick={() => void findOne(c.id)}
        disabled={finding.has(c.id)}
        className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium ring-1 ring-line-strong ring-inset transition-colors hover:bg-forest-soft hover:text-accent disabled:opacity-60"
      >
        <SearchIcon size={13} />
        {finding.has(c.id) ? "Taranıyor…" : "E-posta bul"}
      </button>
    ) : null;

  return (
    <div className="grid gap-5">
      <Toaster />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Görünüm"
          items={[
            { key: "kisiler", label: "Kişiler", pressed: view === "kisiler", onClick: () => setView("kisiler") },
            { key: "listeler", label: `Listeler${lists.length ? ` (${lists.length})` : ""}`, pressed: view === "listeler", onClick: () => setView("listeler") },
            { key: "kara-liste", label: `Kara liste${suppressions.length ? ` (${suppressions.length})` : ""}`, pressed: view === "kara-liste", onClick: () => setView("kara-liste") },
          ]}
        />
        {view === "kisiler" && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => setPanel({ mode: "csv" })}>
              CSV içe aktar
            </Button>
            <Button variant="secondary" onClick={openNew}>
              <PlusIcon size={16} />
              Kişi ekle
            </Button>
            {account && (
              <ButtonLink href="/panel/kisi-bul">
                <SparkleIcon size={16} />
                Müşteri bul
              </ButtonLink>
            )}
          </div>
        )}
      </div>

      {view === "listeler" && (
        <div className="rounded-panel bg-surface p-5 ring-1 ring-line sm:p-6">
          <ListsView
            lists={lists}
            onChanged={() => void loadLists()}
            onOpen={(id) => {
              setView("kisiler");
              patch({ list: id });
            }}
          />
        </div>
      )}

      {view === "kara-liste" && (
        <div className="rounded-panel bg-surface p-5 ring-1 ring-line sm:p-6">
          <SuppressionsView items={suppressions} onChanged={() => void loadSuppressions()} />
        </div>
      )}

      {view === "kisiler" && (
        <div className={`grid items-start gap-6 ${panel ? "lg:grid-cols-[minmax(0,1fr)_24rem]" : ""}`}>
          <section aria-label="Kişiler" className="grid min-w-0 gap-4 rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
            {/* Araç çubuğu: arama ve üç süzgeç tek satırda. */}
            <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
              <label className="relative">
                <span className="sr-only">Kişi ara</span>
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">
                  <SearchIcon size={16} />
                </span>
                <input
                  value={filters.q}
                  onChange={(e) => patch({ q: e.target.value })}
                  maxLength={80}
                  placeholder="Ad, firma, e-posta ya da şehir ara"
                  className="h-10 w-full rounded-full bg-surface pr-4 pl-10 ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest"
                />
              </label>
              <Select<string> label="E-posta durumu" value={filters.status} options={statusOptions} onChange={(v) => patch({ status: v })} />
              <Select<string> label="Adres türü" value={filters.kind} options={kindOptions} onChange={(v) => patch({ kind: v })} />
              <Select<string>
                label="Liste"
                value={filters.list}
                options={[{ value: "", label: "Tüm listeler" }, ...lists.map((l) => ({ value: l.id, label: `${l.name} (${l.count})` }))]}
                onChange={(v) => patch({ list: v })}
              />
            </div>

            {run && (
              <div role="status" className="grid gap-2 rounded-row bg-forest-soft px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    {run.done} / {run.total} firma tarandı · {run.found} e-posta bulundu
                  </span>
                  <button type="button" onClick={() => (cancel.current = true)} className="font-medium text-accent underline underline-offset-4 hover:no-underline">
                    Durdur
                  </button>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                  <div className="h-full rounded-full bg-forest transition-[width] duration-500" style={{ width: `${(run.done / run.total) * 100}%` }} />
                </div>
              </div>
            )}

            {selected.size > 0 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-row bg-forest-soft/70 px-3 py-2 ring-1 ring-forest/20">
                <span className="mr-1 text-sm font-medium">{selected.size} kişi seçili</span>
                <Button variant="secondary" onClick={() => void findSelected()} disabled={Boolean(run)}>
                  <SearchIcon size={16} />
                  E-posta bul
                </Button>
                {newList === null ? (
                  <Select<string>
                    label="Listeye ekle"
                    value=""
                    options={[{ value: "", label: "Listeye ekle…" }, ...lists.map((l) => ({ value: l.id, label: l.name })), { value: "__yeni", label: "+ Yeni liste" }]}
                    onChange={(v) => (v === "__yeni" ? setNewList("") : v && void addSelectedToList(v))}
                  />
                ) : (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newList.trim()) void createListAndAdd(newList.trim());
                    }}
                  >
                    <input
                      autoFocus
                      value={newList}
                      onChange={(e) => setNewList(e.target.value)}
                      maxLength={80}
                      aria-label="Yeni liste adı"
                      placeholder="Liste adı"
                      className="h-10 w-44 rounded-control bg-surface px-3 ring-1 ring-line-strong ring-inset outline-none focus:ring-2 focus:ring-forest"
                    />
                    <Button type="submit" disabled={!newList.trim()}>
                      Ekle
                    </Button>
                    <Button variant="quiet" onClick={() => setNewList(null)}>
                      Vazgeç
                    </Button>
                  </form>
                )}
                <Button variant="secondary" onClick={exportSelected}>
                  <DownloadIcon size={16} />
                  CSV
                </Button>
                <Button variant="quiet" onClick={() => void removeSelected()} className="ml-auto text-danger">
                  <TrashIcon size={16} />
                  Sil
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
                  <span>
                    <span className="font-medium tabular-nums text-ink">{total}</span> kişi{filtered ? " (filtreyle)" : ""}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    bu sayfada <span className="font-medium tabular-nums text-ink">{withEmail}</span> geçerli e-posta
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  <button type="button" onClick={() => void findAllMissing()} disabled={Boolean(run)} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 font-medium text-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-50">
                    <SearchIcon size={15} />
                    E-postası olmayanları tara
                  </button>
                  <button type="button" onClick={exportSelected} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 font-medium text-muted transition-colors hover:bg-sunken hover:text-ink">
                    <DownloadIcon size={15} />
                    Sayfayı CSV indir
                  </button>
                </div>
              </div>
            )}

            {contacts.length === 0 ? (
              <div className="grid justify-items-center gap-4 rounded-row px-4 py-16 text-center ring-1 ring-line ring-inset">
                <span className="grid size-12 place-items-center rounded-full bg-forest-soft text-accent">
                  <UsersIcon size={22} />
                </span>
                <div className="grid gap-1.5">
                  <p className="text-lg font-semibold tracking-tight">{filtered ? "Filtreye uyan kişi yok" : "Henüz kişiniz yok"}</p>
                  <p className="mx-auto max-w-[30rem] text-muted">{filtered ? "Filtreleri gevşetmeyi ya da aramayı temizlemeyi deneyin." : "Müşteri bul ile unvana göre iş e-postalarını bulun, CSV yükleyin ya da elle kişi ekleyin."}</p>
                </div>
                {!filtered && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {account && (
                      <ButtonLink href="/panel/kisi-bul">
                        <SparkleIcon size={16} />
                        Müşteri bul
                      </ButtonLink>
                    )}
                    <Button variant="secondary" onClick={() => setPanel({ mode: "csv" })}>
                      CSV içe aktar
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div aria-busy={loading}>
                {slow ? (
                  <ContactRowsSkeleton rows={Math.min(Math.max(contacts.length, 5), 10)} />
                ) : (
                  <>
                {/* Geniş ekran: gerçek tablo */}
                <div className="hidden overflow-x-auto rounded-row ring-1 ring-line md:block">
                  <table className="w-full min-w-[56rem] text-left text-sm">
                    <thead className="bg-sunken/60 text-xs text-muted">
                      <tr>
                        <th scope="col" className="w-10 px-3 py-2.5">
                          <input type="checkbox" aria-label="Sayfadakilerin tümünü seç" checked={allSelected} onChange={toggleAll} className="size-4 accent-[var(--color-forest)]" />
                        </th>
                        {["Kişi", "Şirket", "E-posta", "Konum", "Liste · Kaynak"].map((h) => (
                          <th key={h} scope="col" className="px-3 py-2.5 font-medium">
                            {h}
                          </th>
                        ))}
                        <th scope="col" className="px-3 py-2.5 text-right font-medium">
                          <span className="sr-only">İşlemler</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((c) => (
                        <tr key={c.id} className={`border-t border-line align-middle transition-colors ${selected.has(c.id) ? "bg-forest-soft/40" : "hover:bg-sunken/40"}`}>
                          <td className="px-3 py-3">
                            <input type="checkbox" aria-label={`${c.name ?? c.company ?? c.email} seç`} checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="size-4 accent-[var(--color-forest)]" />
                          </td>
                          <td className="max-w-[16rem] px-3 py-3">
                            <button type="button" onClick={() => openEdit(c)} className="flex min-w-0 items-center gap-3 text-left">
                              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-forest-soft text-xs font-semibold text-accent">
                                {initialsOf(c)}
                              </span>
                              <span className="grid min-w-0">
                                <span className="truncate font-medium">{c.name ?? c.company ?? "(adsız)"}</span>
                                <span className="truncate text-xs text-muted">{c.jobTitle ?? "—"}</span>
                              </span>
                            </button>
                          </td>
                          <td className="max-w-[14rem] px-3 py-3">
                            <span className="block truncate">{c.name ? (c.company ?? "—") : "—"}</span>
                            <span className="block truncate text-xs text-muted">{hostOf(c.website) ?? ""}</span>
                          </td>
                          <td className="max-w-[17rem] px-3 py-3">{emailCell(c)}</td>
                          <td className="max-w-[10rem] px-3 py-3 text-muted">
                            <span className="block truncate">{c.city ?? "—"}</span>
                            {c.phone && <span className="block truncate text-xs">{c.phone}</span>}
                          </td>
                          <td className="max-w-[12rem] px-3 py-3">
                            <span className="block truncate">{c.lists.length > 0 ? c.lists.map((l) => l.name).join(", ") : <span className="text-muted">Listede değil</span>}</span>
                            <span className="block text-xs text-muted">{sourceLabels[c.source]}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {findButton(c)}
                              <RowMenu label={`${c.name ?? c.company ?? c.email ?? "Kişi"} için işlemler`} items={menuFor(c)} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Dar ekran: kart listesi */}
                <ul className="grid gap-3 md:hidden">
                  {contacts.map((c) => (
                    <li key={c.id} className="grid gap-3 rounded-row p-3.5 ring-1 ring-line">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" aria-label={`${c.name ?? c.company ?? c.email} seç`} checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="mt-2.5 size-4 shrink-0 accent-[var(--color-forest)]" />
                        <button type="button" onClick={() => openEdit(c)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-forest-soft text-xs font-semibold text-accent">
                            {initialsOf(c)}
                          </span>
                          <span className="grid min-w-0">
                            <span className="truncate font-medium">{c.name ?? c.company ?? "(adsız)"}</span>
                            <span className="truncate text-xs text-muted">{[c.jobTitle, c.name ? c.company : null].filter(Boolean).join(" · ") || "—"}</span>
                          </span>
                        </button>
                        <RowMenu label={`${c.name ?? c.company ?? c.email ?? "Kişi"} için işlemler`} items={menuFor(c)} />
                      </div>
                      <div className="pl-7 text-sm">{emailCell(c)}</div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pl-7 text-xs text-muted">
                        <span>{[c.city, sourceLabels[c.source]].filter(Boolean).join(" · ")}</span>
                        {findButton(c)}
                      </div>
                    </li>
                  ))}
                </ul>

                  </>
                )}

                {pages > 1 && (
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted">
                    <span>
                      {(filters.page - 1) * PER_PAGE + 1}–{Math.min(filters.page * PER_PAGE, total)} / {total}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="secondary" disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
                        Önceki
                      </Button>
                      <Button variant="secondary" disabled={filters.page >= pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
                        Sonraki
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {panel && (
            <aside aria-label={panel.mode === "csv" ? "CSV içe aktar" : "Kişi formu"} className="rounded-panel bg-surface p-5 ring-1 ring-line lg:sticky lg:top-6">
              {panel.mode === "csv" ? (
                <CsvPanel
                  onDone={() => {
                    setPanel(null);
                    refetch();
                  }}
                  onCancel={() => setPanel(null)}
                />
              ) : (
                <ContactForm
                  key={panel.mode === "edit" ? panel.contact.id : "yeni"}
                  draft={draft}
                  onChange={setDraft}
                  contact={panel.mode === "edit" ? panel.contact : null}
                  saving={saving}
                  finding={panel.mode === "edit" && finding.has(panel.contact.id)}
                  onSave={() => void save()}
                  onCancel={() => setPanel(null)}
                  onFind={panel.mode === "edit" ? () => void findOne(panel.contact.id) : undefined}
                />
              )}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
