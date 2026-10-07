"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Collapse } from "@/components/ui/collapse";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { scoreTone } from "@/lib/score";
import { safeUrl, telHref } from "@/lib/url";
import { followStatuses, type FollowStatus } from "@/modules/favorites/status";
import type { Favorite } from "@/modules/favorites/repository";

const linkClass = "rounded-control px-3 py-1.5 text-sm font-medium ring-1 ring-line-strong ring-inset hover:bg-sunken";
const statusOptions = followStatuses.map((s) => ({ value: s.value, label: s.label }));

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

function FavoriteCard({ fav }: { fav: Favorite }) {
  const router = useRouter();
  const [status, setStatus] = useState<FollowStatus>(fav.status);
  const [note, setNote] = useState(fav.note);
  const [savedNote, setSavedNote] = useState(fav.note);
  const [noteState, setNoteState] = useState<"idle" | "saving" | "saved">("idle");
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const website = safeUrl(fav.website);
  const maps = safeUrl(fav.maps_url);
  const tel = telHref(fav.phone);
  const score = fav.lead_score ?? 0;

  async function changeStatus(next: FollowStatus) {
    const previous = status;
    setStatus(next);
    setError(null);
    try {
      await patch(fav.id, { status: next });
    } catch (e) {
      setStatus(previous);
      setError(e instanceof Error ? e.message : "Kaydedilemedi. Tekrar deneyin.");
    }
  }

  async function saveNote() {
    if (note.trim() === savedNote) return;
    setNoteState("saving");
    setError(null);
    try {
      await patch(fav.id, { note });
      setSavedNote(note.trim());
      setNoteState("saved");
    } catch (e) {
      setNoteState("idle");
      setError(e instanceof Error ? e.message : "Kaydedilemedi. Tekrar deneyin.");
    }
  }

  async function remove() {
    setError(null);
    try {
      const res = await fetch(`/api/favorites?placeId=${encodeURIComponent(fav.place_id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Takipten çıkarılamadı. Tekrar deneyin.");
      setRemoved(true); // kart yumuşakça kapanır
      setTimeout(() => router.refresh(), 450);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Takipten çıkarılamadı. Tekrar deneyin.");
    }
  }

  return (
    <li>
      <Collapse open={!removed}>
        <article
          aria-label={fav.name}
          className="mb-4 grid gap-5 rounded-panel bg-surface p-5 ring-1 ring-line sm:p-6"
        >
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight">{fav.name}</h2>
              <p className="truncate text-sm text-muted">
                {[fav.category, fav.city].filter(Boolean).join(" · ")}
                {fav.rating ? ` · ${String(fav.rating).replace(".", ",")} puan` : ""}
                {fav.review_count ? ` (${fav.review_count} yorum)` : ""}
              </p>
              {fav.source && <p className="mt-0.5 truncate text-xs text-muted">Bulunduğu arama: {fav.source}</p>}
              {(!fav.website || !fav.phone) && (
                <p className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {!fav.website && <span className="rounded-full bg-pollen px-2 py-0.5 font-medium">Web sitesi yok</span>}
                  {!fav.phone && <span className="rounded-full bg-sunken px-2 py-0.5">Telefon yok</span>}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                {score}
                <span className="sr-only"> genel skor</span>
              </p>
              <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
                <div className={`h-full rounded-full ${scoreTone(score)}`} style={{ width: `${score}%` }} />
              </div>
            </div>
          </header>

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

          <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-[14rem_1fr]">
            <div className="grid content-start gap-2">
              <p className="text-sm font-medium">Aşama</p>
              <Select<FollowStatus> label={`${fav.name} aşaması`} value={status} options={statusOptions} onChange={changeStatus} />
            </div>
            <div className="grid gap-2">
              <label htmlFor={`note-${fav.id}`} className="flex items-baseline justify-between gap-3 text-sm font-medium">
                Not
                <span className="text-xs font-normal text-muted" role="status">
                  {noteState === "saving" ? "Kaydediliyor…" : noteState === "saved" ? "Kaydedildi" : `${note.length} / 500`}
                </span>
              </label>
              <textarea
                id={`note-${fav.id}`}
                rows={2}
                maxLength={500}
                value={note}
                placeholder="Görüşme notları, bir sonraki adım…"
                onChange={(e) => {
                  setNote(e.target.value);
                  setNoteState("idle");
                }}
                onBlur={saveNote}
                className="resize-y rounded-row bg-surface px-3.5 py-2.5 leading-relaxed ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-control bg-danger-soft px-4 py-2.5 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={remove}
              className="rounded-control px-3 py-1.5 text-sm text-muted transition-colors hover:bg-sunken hover:text-danger"
            >
              Takipten çıkar
            </button>
          </div>
        </article>
      </Collapse>
    </li>
  );
}

export function FavoritesBoard({ favorites }: { favorites: Favorite[] }) {
  const [filter, setFilter] = useState<FollowStatus | "all">("all");

  if (favorites.length === 0) {
    return (
      <div className="grid justify-items-center gap-4 rounded-panel bg-surface px-6 py-16 text-center ring-1 ring-line">
        <p className="text-lg font-semibold tracking-tight">Henüz takibe aldığınız firma yok</p>
        <p className="max-w-[28rem] text-muted">
          Müşteri bul sayfasında, ilginizi çeken firmanın yanındaki yıldıza basın. Takibe aldığınız firmalar burada toplanır;
          her biri için aşamayı ve notlarınızı tutabilirsiniz.
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

  const count = (s: FollowStatus) => favorites.filter((f) => f.status === s).length;
  const shown = filter === "all" ? favorites : favorites.filter((f) => f.status === filter);

  return (
    <div className="grid gap-5">
      <div className="overflow-x-auto pb-1">
        <div className="min-w-max">
          <Segmented
            label="Aşamaya göre filtrele"
            items={[
              { key: "all", label: `Tümü ${favorites.length}`, pressed: filter === "all", onClick: () => setFilter("all") },
              ...followStatuses.map((s) => ({
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
            <FavoriteCard key={f.id} fav={f} />
          ))}
        </ul>
      )}
    </div>
  );
}
