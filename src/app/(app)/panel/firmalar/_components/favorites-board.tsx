"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Collapse } from "@/components/ui/collapse";
import { Segmented } from "@/components/ui/segmented";
import { toast, Toaster } from "@/components/ui/toast";
import { safeUrl, telHref } from "@/lib/url";
import { followStages, stageOf, type FollowStage, type FollowStatus } from "@/modules/favorites/status";
import type { Favorite } from "@/modules/favorites/repository";

const linkClass = "rounded-control px-3 py-1.5 text-sm font-medium ring-1 ring-line-strong ring-inset hover:bg-sunken";

async function patch(id: string, body: { status?: FollowStatus; note?: string }) {
  const res = await fetch(`/api/favorites/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Kaydedilemedi. Tekrar deneyin.");
  }
}

const failMessage = (e: unknown) => (e instanceof Error ? e.message : "Kaydedilemedi. Tekrar deneyin.");

function FavoriteCard({ fav, onStage }: { fav: Favorite; onStage: (id: string, stage: FollowStage) => void }) {
  const router = useRouter();
  const [stage, setStage] = useState<FollowStage>(stageOf(fav.status));
  const [note, setNote] = useState(fav.note);
  const [savedNote, setSavedNote] = useState(fav.note);
  const [noteOpen, setNoteOpen] = useState(Boolean(fav.note));
  const [removed, setRemoved] = useState(false);

  const website = safeUrl(fav.website);
  const maps = safeUrl(fav.maps_url);
  const tel = telHref(fav.phone);

  async function changeStage(next: FollowStage) {
    if (next === stage) return;
    const previous = stage;
    setStage(next);
    try {
      await patch(fav.id, { status: next });
      onStage(fav.id, next);
      toast(`Aşama güncellendi: ${followStages.find((s) => s.value === next)?.label}`);
    } catch (e) {
      setStage(previous);
      toast(failMessage(e), { kind: "error" });
    }
  }

  async function saveNote() {
    if (note.trim() === savedNote) return;
    try {
      await patch(fav.id, { note });
      setSavedNote(note.trim());
      toast("Not kaydedildi");
    } catch (e) {
      toast(failMessage(e), { kind: "error" });
    }
  }

  async function remove() {
    try {
      const res = await fetch(`/api/favorites?placeId=${encodeURIComponent(fav.place_id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Takipten çıkarılamadı. Tekrar deneyin.");
      setRemoved(true); // kart yumuşakça kapanır
      toast(`${fav.name} takipten çıkarıldı`);
      setTimeout(() => router.refresh(), 450);
    } catch (e) {
      toast(failMessage(e), { kind: "error" });
    }
  }

  return (
    <li>
      <Collapse open={!removed}>
        <article aria-label={fav.name} className="mb-4 grid gap-4 rounded-panel bg-surface p-5 ring-1 ring-line">
          <header className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold tracking-tight">{fav.name}</h2>
              <p className="truncate text-sm text-muted">
                {[fav.category, fav.city].filter(Boolean).join(" · ")}
                {fav.rating ? ` · ${String(fav.rating).replace(".", ",")} puan` : ""}
                {fav.review_count ? ` (${fav.review_count} yorum)` : ""}
              </p>
            </div>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {fav.lead_score ?? 0}
              <span className="sr-only"> genel skor</span>
            </p>
            <button
              type="button"
              onClick={remove}
              aria-label={`${fav.name} firmasını takipten çıkar`}
              title="Takipten çıkar"
              className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-forest transition-colors hover:bg-sunken"
            >
              <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
                <path d="M7.5 4h9a1 1 0 0 1 1 1v14.5l-5.5-3.7-5.5 3.7V5a1 1 0 0 1 1-1Z" fill="currentColor" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
            </button>
          </header>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="w-full sm:w-auto sm:min-w-[19rem]">
              <Segmented
                label={`${fav.name} aşaması`}
                items={followStages.map((s) => ({ key: s.value, label: s.label, pressed: stage === s.value, onClick: () => changeStage(s.value) }))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {tel && (
                <a href={tel} className={linkClass}>
                  {fav.phone}
                </a>
              )}
              {website && (
                <a href={website} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  Web sitesi
                </a>
              )}
              {maps && (
                <a href={maps} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  Haritada aç
                </a>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <button
              type="button"
              aria-expanded={noteOpen}
              onClick={() => setNoteOpen((o) => !o)}
              className="group flex w-fit items-center gap-1.5 rounded-control text-sm font-medium text-forest hover:underline"
            >
              {note ? "Notu göster" : "Not ekle"}
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" className="transition-transform duration-300 group-aria-expanded:rotate-180">
                <path d="m3.5 6 4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <Collapse open={noteOpen}>
              <textarea
                aria-label={`${fav.name} notu`}
                rows={3}
                maxLength={500}
                value={note}
                placeholder="Görüşme notları, bir sonraki adım…"
                onChange={(e) => setNote(e.target.value)}
                onBlur={saveNote}
                className="mt-1 w-full resize-y rounded-row bg-surface px-3.5 py-2.5 leading-relaxed ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest"
              />
            </Collapse>
          </div>
        </article>
      </Collapse>
    </li>
  );
}

export function FavoritesBoard({ favorites }: { favorites: Favorite[] }) {
  const [filter, setFilter] = useState<FollowStage | "all">("all");
  // Aşaması değişen firma filtre sayılarına hemen yansısın diye yerel aşama tablosu tutulur.
  const [stages, setStages] = useState<Record<string, FollowStage>>({});
  const stageFor = (f: Favorite) => stages[f.id] ?? stageOf(f.status);

  if (favorites.length === 0) {
    return (
      <div className="grid justify-items-center gap-4 rounded-panel bg-surface px-6 py-16 text-center ring-1 ring-line">
        <Toaster />
        <p className="text-lg font-semibold tracking-tight">Henüz takibe aldığınız firma yok</p>
        <p className="max-w-[28rem] text-muted">
          Müşteri bul sayfasında, ilginizi çeken firmanın sağ üstündeki yer imi simgesine basın. Takibe aldığınız firmalar burada toplanır.
        </p>
        <Link
          href="/panel/musteri-bul"
          className="inline-flex h-11 items-center rounded-control bg-forest px-5 font-medium text-white hover:bg-forest-hover"
        >
          Müşteri bul&apos;a git
        </Link>
      </div>
    );
  }

  const count = (s: FollowStage) => favorites.filter((f) => stageFor(f) === s).length;
  const shown = filter === "all" ? favorites : favorites.filter((f) => stageFor(f) === filter);

  return (
    <div className="grid gap-5">
      <Toaster />
      <div className="overflow-x-auto pb-1">
        <div className="min-w-max">
          <Segmented
            label="Aşamaya göre filtrele"
            items={[
              { key: "all", label: `Tümü ${favorites.length}`, pressed: filter === "all", onClick: () => setFilter("all") },
              ...followStages.map((s) => ({
                key: s.value,
                label: `${s.label} ${count(s.value)}`,
                pressed: filter === s.value,
                onClick: () => setFilter(s.value),
              })),
            ]}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-panel bg-surface px-5 py-10 text-center text-muted ring-1 ring-line">Bu aşamada firma yok.</p>
      ) : (
        <ul>
          {shown.map((f) => (
            <FavoriteCard key={f.id} fav={f} onStage={(id, stage) => setStages((s) => ({ ...s, [id]: stage }))} />
          ))}
        </ul>
      )}
    </div>
  );
}
