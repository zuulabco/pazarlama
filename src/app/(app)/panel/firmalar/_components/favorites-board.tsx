"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionLink } from "@/components/ui/action-link";
import { Collapse } from "@/components/ui/collapse";
import { Disclosure } from "@/components/ui/disclosure";
import { ArrowLeftIcon, ArrowRightIcon, BookmarkIcon, GlobeIcon, MailIcon, MapPinIcon, NoteIcon, PenIcon, PhoneIcon, SearchIcon } from "@/components/ui/icons";
import { toast, Toaster } from "@/components/ui/toast";
import { fold } from "@/lib/text";
import { safeUrl, telHref } from "@/lib/url";
import { followStages, stageOf, type FollowStage, type FollowStatus } from "@/modules/favorites/status";
import type { FavoriteNote, FavoriteWithNotes as Favorite } from "@/modules/favorites/repository";

const stageDot: Record<FollowStage, string> = {
  takipte: "bg-score-mid",
  iletisim: "bg-pollen",
  kazanildi: "bg-forest",
};

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

async function patch(id: string, body: { status?: FollowStatus; email?: string }) {
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
const labelOf = (stage: FollowStage) => followStages.find((s) => s.value === stage)!.label;

function FavoriteCard({
  fav,
  stage,
  dragging,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  fav: Favorite;
  stage: FollowStage;
  dragging: boolean;
  onMove: (fav: Favorite, stage: FollowStage) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState<FavoriteNote[]>(fav.notes);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [email, setEmail] = useState(fav.email ?? "");
  const [savedEmail, setSavedEmail] = useState(fav.email ?? "");

  const website = safeUrl(fav.website);
  const maps = safeUrl(fav.maps_url);
  const tel = telHref(fav.phone);
  const position = followStages.findIndex((s) => s.value === stage);
  const prev = followStages[position - 1];
  const next = followStages[position + 1];

  async function addMessage() {
    const text = draft.trim();
    if (!text || adding) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/favorites/${fav.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = (await res.json().catch(() => null)) as { note?: FavoriteNote; error?: string } | null;
      if (!res.ok || !body?.note) throw new Error(body?.error ?? "Mesaj eklenemedi. Tekrar deneyin.");
      setNotes((n) => [body.note!, ...n]);
      setDraft("");
      toast("Mesaj eklendi");
    } catch (e) {
      toast(failMessage(e), { kind: "error" });
    } finally {
      setAdding(false);
    }
  }

  async function removeMessage(noteId: string) {
    try {
      const res = await fetch(`/api/favorites/${fav.id}/notes?noteId=${noteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Mesaj silinemedi. Tekrar deneyin.");
      setNotes((n) => n.filter((x) => x.id !== noteId));
      toast("Mesaj silindi");
    } catch (e) {
      toast(failMessage(e), { kind: "error" });
    }
  }

  const move = (target: FollowStage) => onMove(fav, target);

  async function saveEmail() {
    const value = email.trim();
    if (value === savedEmail) return;
    try {
      await patch(fav.id, { email: value });
      setSavedEmail(value);
      toast(value ? "E-posta kaydedildi" : "E-posta silindi");
    } catch (e) {
      setEmail(savedEmail);
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
        <article
          aria-label={fav.name}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", fav.id);
            e.dataTransfer.effectAllowed = "move";
            onDragStart(fav.id);
          }}
          onDragEnd={onDragEnd}
          className={`mb-3 cursor-grab rounded-row bg-surface shadow-sm ring-1 ring-line transition-opacity active:cursor-grabbing ${dragging ? "opacity-40" : ""}`}
        >
          <Disclosure
            buttonClassName="items-start p-4"
            panelClassName="grid gap-3.5 border-t border-line px-4 py-4"
            summary={
              <span className="flex min-w-0 flex-1 items-start gap-3">
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block font-semibold leading-snug tracking-tight">{fav.name}</span>
                  <span className="mt-0.5 block truncate text-sm text-muted">
                    {[fav.category, fav.city].filter(Boolean).join(" · ")}
                    {fav.rating ? ` · ${String(fav.rating).replace(".", ",")} puan` : ""}
                  </span>
                  {(!fav.website || notes.length > 0) && (
                    <span className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                      {!fav.website && <span className="rounded-full bg-pollen px-2 py-0.5 font-medium">Web sitesi yok</span>}
                      {notes.length > 0 && <span className="rounded-full bg-sunken px-2 py-0.5 text-muted">{notes.length} mesaj</span>}
                    </span>
                  )}
                </span>
                <span className="rounded-full bg-sunken px-2.5 py-1 text-sm font-semibold tabular-nums">
                  {fav.lead_score ?? 0}
                  <span className="sr-only"> genel skor</span>
                </span>
              </span>
            }
          >
          <Link
            href={`/panel/calis?firma=${fav.id}`}
            className="inline-flex h-9 w-fit items-center gap-2 rounded-full bg-forest px-3.5 text-sm font-medium text-white transition-colors hover:bg-forest-hover"
          >
            <PenIcon size={16} />
            Bu müşteriye ulaş
          </Link>

          <div className="flex items-center gap-2">
            {tel && <ActionLink iconOnly href={tel} icon={<PhoneIcon />} label={`Ara: ${fav.phone}`} />}
            {savedEmail && <ActionLink iconOnly href={`mailto:${savedEmail}`} icon={<MailIcon />} label={`E-posta: ${savedEmail}`} />}
            {website && <ActionLink iconOnly external href={website} icon={<GlobeIcon />} label="Web sitesi" />}
            {maps && <ActionLink iconOnly external href={maps} icon={<MapPinIcon />} label="Haritada aç" />}
            <button
              type="button"
              onClick={remove}
              aria-label={`${fav.name} firmasını takipten çıkar`}
              title="Takipten çıkar"
              className="ml-auto grid size-9 place-items-center rounded-full text-forest transition-colors hover:bg-sunken"
            >
              <BookmarkIcon filled />
            </button>
          </div>

          <label className="grid gap-1.5 text-sm font-medium">
            E-posta
            <input
              type="email"
              value={email}
              maxLength={254}
              placeholder="ornek@firma.com"
              onChange={(e) => setEmail(e.target.value)}
              onBlur={saveEmail}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="h-10 rounded-control bg-surface px-3 text-sm font-normal ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest"
            />
          </label>

          <div className="grid gap-2">
            <button
              type="button"
              aria-expanded={noteOpen}
              onClick={() => setNoteOpen((o) => !o)}
              className="flex min-w-0 items-center gap-2 rounded-control text-left text-sm text-muted transition-colors hover:text-ink"
            >
              <NoteIcon size={16} />
              <span className="truncate">{notes.length ? `${notes.length} mesaj · ${notes[0].body}` : "Mesaj ekle"}</span>
            </button>
            <Collapse open={noteOpen}>
              <div className="grid gap-2.5">
                {notes.length > 0 && (
                  <ul className="grid gap-2" aria-label={`${fav.name} mesajları`}>
                    {notes.map((n) => (
                      <li key={n.id} className="rounded-control bg-sunken/70 px-3 py-2.5 text-sm">
                        <p className="break-words whitespace-pre-line">{n.body}</p>
                        <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-muted">
                          <time dateTime={n.created_at}>{dateFormat.format(new Date(n.created_at))}</time>
                          <button
                            type="button"
                            onClick={() => removeMessage(n.id)}
                            aria-label="Mesajı sil"
                            className="rounded-full px-2 py-0.5 transition-colors hover:bg-line hover:text-danger"
                          >
                            Sil
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <textarea
                  aria-label={`${fav.name} için yeni mesaj`}
                  rows={2}
                  maxLength={500}
                  value={draft}
                  placeholder="Yeni mesaj yazın…"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      void addMessage();
                    }
                  }}
                  className="w-full resize-y rounded-row bg-surface px-3 py-2.5 text-sm leading-relaxed ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={addMessage}
                    disabled={!draft.trim() || adding}
                    className="inline-flex h-9 items-center rounded-full bg-forest px-5 text-sm font-medium text-white transition-colors hover:bg-forest-hover disabled:opacity-45"
                  >
                    {adding ? "Ekleniyor…" : "Ekle"}
                  </button>
                </div>
              </div>
            </Collapse>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-line pt-3 text-sm">
            {prev ? (
              <button type="button" onClick={() => move(prev.value)} className="inline-flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-2 text-muted transition-colors hover:bg-sunken hover:text-ink">
                <ArrowLeftIcon size={15} />
                {prev.label}
              </button>
            ) : (
              <span />
            )}
            {next && (
              <button type="button" onClick={() => move(next.value)} className="inline-flex items-center gap-1.5 rounded-full bg-forest-soft py-1 pr-2 pl-3 font-medium text-forest transition-colors hover:bg-line">
                {next.label}
                <ArrowRightIcon size={15} />
              </button>
            )}
          </div>
          </Disclosure>
        </article>
      </Collapse>
    </li>
  );
}

export function FavoritesBoard({ favorites }: { favorites: Favorite[] }) {
  const [query, setQuery] = useState("");
  // Taşınan firma sütununa hemen geçsin diye yerel aşama tablosu tutulur.
  const [stages, setStages] = useState<Record<string, FollowStage>>({});
  const stageFor = (f: Favorite) => stages[f.id] ?? stageOf(f.status);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<FollowStage | null>(null);

  /** Firmayı başka aşamaya taşır (düğmeyle ya da sürükle-bırakla); anında yansır, başarısız olursa geri alınır. */
  async function moveTo(fav: Favorite, target: FollowStage) {
    const previous = stageFor(fav);
    if (previous === target) return;
    setStages((m) => ({ ...m, [fav.id]: target }));
    try {
      await patch(fav.id, { status: target });
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

  const q = fold(query.trim());
  const visible = q ? favorites.filter((f) => fold(`${f.name} ${f.category ?? ""} ${f.city ?? ""} ${f.notes.map((n) => n.body).join(" ")}`).includes(q)) : favorites;

  return (
    <div className="grid gap-5">
      <Toaster />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative block w-full sm:w-80">
          <span className="sr-only">Takipteki firmalarda ara</span>
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Firma ara"
            className="h-11 w-full rounded-full bg-surface pr-4 pl-10 ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest"
          />
        </label>
        <p className="text-sm text-muted">
          <strong className="font-semibold text-ink tabular-nums">{favorites.length}</strong> firma takipte
          <span className="hidden lg:inline"> · Kartları sürükleyip aşamalar arasında taşıyabilirsiniz</span>
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {followStages.map((s) => {
          const items = visible.filter((f) => stageFor(f) === s.value);
          return (
            <section
              key={s.value}
              aria-label={s.label}
              onDragOver={(e) => {
                if (!dragging) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOver(s.value);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver((o) => (o === s.value ? null : o));
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || dragging;
                const fav = favorites.find((f) => f.id === id);
                setDragging(null);
                setOver(null);
                if (fav) void moveTo(fav, s.value);
              }}
              className={`rounded-panel p-3 ring-1 transition-[background-color,box-shadow] duration-200 ${
                dragging && over === s.value ? "bg-forest-soft/70 ring-2 ring-forest" : "bg-sunken/50 ring-line"
              }`}
            >
              <h2 className="flex items-center gap-2.5 px-2 pt-1 pb-3 font-semibold tracking-tight">
                <span className={`size-2.5 rounded-full ${stageDot[s.value]}`} aria-hidden="true" />
                {s.label}
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted tabular-nums">{items.length}</span>
              </h2>
              {items.length === 0 ? (
                <p className="rounded-row border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
                  {dragging ? "Buraya bırakın" : q ? "Eşleşen firma yok." : "Bu aşamada firma yok."}
                </p>
              ) : (
                <ul>
                  {items.map((f) => (
                    <FavoriteCard
                      key={f.id}
                      fav={f}
                      stage={s.value}
                      dragging={dragging === f.id}
                      onMove={moveTo}
                      onDragStart={setDragging}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
