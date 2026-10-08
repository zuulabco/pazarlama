"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionLink } from "@/components/ui/action-link";
import { ButtonLink } from "@/components/ui/button";
import { CalendarIcon, GlobeIcon, MailIcon, MapPinIcon, PenIcon, PhoneIcon, SearchIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { toast, Toaster } from "@/components/ui/toast";
import { fold } from "@/lib/text";
import { safeUrl, telHref } from "@/lib/url";
import type { FavoriteNote, FavoriteWithNotes as Favorite } from "@/modules/favorites/repository";
import { followStages, stageOf, type FollowStage, type FollowStatus } from "@/modules/favorites/status";

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });
const dayFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Istanbul" });
const failMessage = (e: unknown) => (e instanceof Error ? e.message : "Kaydedilemedi. Tekrar deneyin.");
const labelOf = (stage: FollowStage) => followStages.find((s) => s.value === stage)!.label;

const stageTone: Record<FollowStage, string> = {
  takipte: "bg-sunken text-muted",
  iletisim: "bg-pollen text-ink",
  kazanildi: "bg-forest-soft text-accent",
};

async function patchStatus(id: string, status: FollowStatus) {
  const res = await fetch(`/api/favorites/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Kaydedilemedi. Tekrar deneyin.");
  }
}

/** Firma ayrıntısı penceresi: aşama, hızlı eylemler, notlar ve takipten çıkarma. */
function FirmModal({ fav, stage, onStage, onClose, onRemoved }: { fav: Favorite; stage: FollowStage; onStage: (s: FollowStage) => void; onClose: () => void; onRemoved: () => void }) {
  const [notes, setNotes] = useState<FavoriteNote[]>(fav.notes);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const website = safeUrl(fav.website);
  const maps = safeUrl(fav.maps_url);
  const tel = telHref(fav.phone);

  async function addNote() {
    const text = draft.trim();
    if (!text || adding) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/favorites/${fav.id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const body = (await res.json().catch(() => null)) as { note?: FavoriteNote; error?: string } | null;
      if (!res.ok || !body?.note) throw new Error(body?.error ?? "Not eklenemedi. Tekrar deneyin.");
      setNotes((n) => [body.note!, ...n]);
      setDraft("");
      toast("Not eklendi");
    } catch (e) {
      toast(failMessage(e), { kind: "error" });
    } finally {
      setAdding(false);
    }
  }

  async function removeNote(noteId: string) {
    try {
      const res = await fetch(`/api/favorites/${fav.id}/notes?noteId=${noteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Not silinemedi. Tekrar deneyin.");
      setNotes((n) => n.filter((x) => x.id !== noteId));
      toast("Not silindi");
    } catch (e) {
      toast(failMessage(e), { kind: "error" });
    }
  }

  async function remove() {
    try {
      const res = await fetch(`/api/favorites?placeId=${encodeURIComponent(fav.place_id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Kayıttan çıkarılamadı. Tekrar deneyin.");
      toast(`${fav.name} kayıtlı firmalardan çıkarıldı`);
      onRemoved();
    } catch (e) {
      toast(failMessage(e), { kind: "error" });
    }
  }

  return (
    <div className="grid gap-5">
      <div className="-mt-3 text-sm text-muted">
        {[fav.category, fav.city].filter(Boolean).join(" · ")}
        {fav.rating ? ` · ${String(fav.rating).replace(".", ",")} puan` : ""}
        {fav.address && <p className="mt-1">{fav.address}</p>}
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium">Aşama</p>
        <Segmented label="Aşama" items={followStages.map((s) => ({ key: s.value, label: s.label, pressed: stage === s.value, onClick: () => onStage(s.value) }))} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ButtonLink href={`/panel/calis?firma=${fav.id}`} className="h-9">
          <PenIcon size={16} />
          Mesaj hazırla
        </ButtonLink>
        <ButtonLink href={`/panel/plan?firma=${fav.id}&yeni=1`} variant="secondary" className="h-9">
          <CalendarIcon size={16} />
          Takvime ekle
        </ButtonLink>
        <div className="ml-auto flex items-center gap-2">
          {tel && <ActionLink iconOnly href={tel} icon={<PhoneIcon />} label={`Ara: ${fav.phone}`} />}
          {fav.email && <ActionLink iconOnly href={`mailto:${fav.email}`} icon={<MailIcon />} label={`E-posta: ${fav.email}`} />}
          {website && <ActionLink iconOnly external href={website} icon={<GlobeIcon />} label="Web sitesi" />}
          {maps && <ActionLink iconOnly external href={maps} icon={<MapPinIcon />} label="Haritada aç" />}
        </div>
      </div>

      <div className="grid gap-2.5">
        <p className="text-sm font-medium">Notlar</p>
        {notes.length > 0 && (
          <ul className="grid gap-2" aria-label={`${fav.name} notları`}>
            {notes.map((n) => (
              <li key={n.id} className="rounded-control bg-sunken/70 px-3 py-2.5 text-sm">
                <p className="break-words whitespace-pre-line">{n.body}</p>
                <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-muted">
                  <time dateTime={n.created_at}>{dateFormat.format(new Date(n.created_at))}</time>
                  <button type="button" onClick={() => void removeNote(n.id)} aria-label="Notu sil" className="rounded-full px-2 py-0.5 transition-colors hover:bg-line hover:text-danger">
                    Sil
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <textarea
          aria-label={`${fav.name} için yeni not`}
          rows={2}
          maxLength={500}
          value={draft}
          placeholder="Yeni not yazın…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void addNote();
            }
          }}
          className="w-full resize-y rounded-row bg-surface px-3 py-2.5 text-sm leading-relaxed ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest"
        />
        <div className="flex justify-end">
          <button type="button" onClick={() => void addNote()} disabled={!draft.trim() || adding} className="inline-flex h-9 items-center rounded-control bg-forest px-5 text-sm font-medium text-white transition-colors hover:bg-forest-hover disabled:opacity-45">
            {adding ? "Ekleniyor…" : "Not ekle"}
          </button>
        </div>
      </div>

      <div className="flex justify-between border-t border-line pt-4">
        <button type="button" onClick={() => void remove()} className="text-sm text-muted transition-colors hover:text-danger">
          Kayıtlı firmalardan çıkar
        </button>
        <button type="button" onClick={onClose} className="text-sm font-medium text-accent underline underline-offset-4 hover:no-underline">
          Kapat
        </button>
      </div>
    </div>
  );
}

const cols = "md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_6.5rem_minmax(0,1fr)_6.5rem]";

/**
 * Kayıtlı firmalar (Kayıtlı kişilerle aynı yapı): arama, aşama filtresi, liste; bir satıra tıklayınca ayrıntı penceresi
 * (aşama, notlar, hızlı eylemler) açılır.
 */
export function SavedFirms({ favorites }: { favorites: Favorite[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FollowStage | "hepsi">("hepsi");
  const [stages, setStages] = useState<Record<string, FollowStage>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  const stageFor = (f: Favorite) => stages[f.id] ?? stageOf(f.status);
  const all = favorites.filter((f) => !removed.has(f.id));
  const open = all.find((f) => f.id === openId) ?? null;

  async function setStage(fav: Favorite, target: FollowStage) {
    const previous = stageFor(fav);
    if (previous === target) return;
    setStages((m) => ({ ...m, [fav.id]: target }));
    try {
      await patchStatus(fav.id, target);
      toast(`${fav.name} → ${labelOf(target)}`);
    } catch (e) {
      setStages((m) => ({ ...m, [fav.id]: previous }));
      toast(failMessage(e), { kind: "error" });
    }
  }

  if (favorites.length === 0) {
    return (
      <div className="grid justify-items-center gap-4 rounded-panel bg-surface px-6 py-16 text-center ring-1 ring-line">
        <Toaster />
        <p className="text-lg font-semibold tracking-tight">Henüz kayıtlı firmanız yok</p>
        <p className="max-w-[28rem] text-muted">Firma bul sayfasında ilginizi çeken firmanın sağ üstündeki yer imi simgesine basın. Kaydettiğiniz firmalar burada toplanır.</p>
        <ButtonLink href="/panel/musteri-bul" size="lg">
          Firma bul
        </ButtonLink>
      </div>
    );
  }

  const q = fold(query.trim());
  const visible = all.filter((f) => (filter === "hepsi" || stageFor(f) === filter) && (!q || fold(`${f.name} ${f.category ?? ""} ${f.city ?? ""} ${f.email ?? ""} ${f.notes.map((n) => n.body).join(" ")}`).includes(q)));
  const count = (s: FollowStage) => all.filter((f) => stageFor(f) === s).length;

  return (
    <div className="grid gap-4">
      <Toaster />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative block w-full sm:w-80">
          <span className="sr-only">Kayıtlı firmalarda ara</span>
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Firma, sektör, ilçe ya da not ara"
            className="h-10 w-full rounded-control bg-surface pr-3.5 pl-10 ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest"
          />
        </label>
        <Segmented
          label="Aşama"
          items={[
            { key: "hepsi", label: `Tümü ${all.length}`, pressed: filter === "hepsi", onClick: () => setFilter("hepsi") },
            ...followStages.map((s) => ({ key: s.value, label: `${s.label} ${count(s.value)}`, pressed: filter === s.value, onClick: () => setFilter(s.value) })),
          ]}
        />
      </div>

      <div className="rounded-panel bg-surface p-3 ring-1 ring-line sm:p-4">
        {visible.length === 0 ? (
          <p className="px-4 py-12 text-center text-muted">Eşleşen firma yok.</p>
        ) : (
          <>
            <div role="row" className={`hidden items-center gap-3 border-b border-line px-2 pb-2 text-xs font-medium text-muted md:grid ${cols}`}>
              <span>Firma</span>
              <span>İletişim</span>
              <span>Skor</span>
              <span>Aşama</span>
              <span className="text-right">Eklendi</span>
            </div>
            <ul>
              {visible.map((f) => {
                const st = stageFor(f);
                return (
                  <li key={f.id} className="border-b border-line last:border-b-0">
                    <button type="button" onClick={() => setOpenId(f.id)} aria-label={`${f.name} ayrıntılarını aç`} className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-2 py-3 text-left transition-colors hover:bg-sunken/50 ${cols}`}>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{f.name}</span>
                        <span className="block truncate text-sm text-muted">{[f.category, f.city].filter(Boolean).join(" · ") || "—"}</span>
                      </span>
                      <span className="hidden min-w-0 text-sm md:block">
                        <span className="block truncate">{f.email ?? f.phone ?? <span className="text-muted">—</span>}</span>
                        {!f.website && <span className="text-xs text-muted">Web sitesi yok</span>}
                      </span>
                      <span className="hidden text-sm tabular-nums md:block">{f.lead_score ?? "—"}</span>
                      <span className="justify-self-end md:justify-self-start">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${stageTone[st]}`}>{labelOf(st)}</span>
                      </span>
                      <span className="hidden text-right text-sm text-muted md:block">{dayFormat.format(new Date(f.created_at))}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      <p className="text-sm text-muted">
        Firma bulmak için{" "}
        <Link href="/panel/musteri-bul" className="font-medium text-accent underline underline-offset-4 hover:no-underline">
          Firma bul
        </Link>
        &apos;a gidin.
      </p>

      <Modal open={open !== null} onClose={() => setOpenId(null)} title={open?.name ?? ""} width="38rem">
        {open && (
          <FirmModal
            key={open.id}
            fav={open}
            stage={stageFor(open)}
            onStage={(s) => void setStage(open, s)}
            onClose={() => setOpenId(null)}
            onRemoved={() => {
              setRemoved((r) => new Set(r).add(open.id));
              setOpenId(null);
              router.refresh();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
