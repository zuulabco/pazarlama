"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import { toast } from "@/components/ui/toast";
import type { ContactList, Suppression } from "@/modules/outreach/contacts";
import { api } from "./contact-ui";

const reasonLabels: Record<Suppression["reason"], string> = { abonelik: "Abonelikten çıktı", bounce: "Geçersiz adres (bounce)", sikayet: "Şikâyet", elle: "Elle eklendi" };

/** Listeler: oluştur, sil, içindeki kişileri gör. */
export function ListsView({
  lists,
  onChanged,
  onOpen,
}: {
  lists: ContactList[];
  onChanged: () => void;
  onOpen: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    const value = name.trim();
    if (!value || busy) return;
    setBusy(true);
    const r = await api<{ list: ContactList }>("/api/outreach/lists", { method: "POST", body: JSON.stringify({ name: value }) });
    setBusy(false);
    if (!r.ok) return toast(r.error, { kind: "error" });
    setName("");
    onChanged();
    toast("Liste oluşturuldu");
  }

  async function remove(list: ContactList) {
    const r = await api<{ ok: true }>(`/api/outreach/lists/${list.id}`, { method: "DELETE" });
    if (!r.ok) return toast(r.error, { kind: "error" });
    onChanged();
    toast("Liste silindi", { action: { label: "Geri al", onClick: () => void api("/api/outreach/lists", { method: "POST", body: JSON.stringify({ name: list.name }) }).then(onChanged) } });
  }

  return (
    <div className="grid gap-5">
      <form
        className="flex gap-2 sm:max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          aria-label="Yeni liste adı"
          placeholder="Yeni liste adı (örn. Kadıköy diş klinikleri)"
          className="h-11 min-w-0 flex-1 rounded-control bg-surface px-3.5 ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest"
        />
        <Button type="submit" disabled={busy || !name.trim()}>
          <PlusIcon size={16} />
          Oluştur
        </Button>
      </form>

      {lists.length === 0 ? (
        <p className="rounded-row bg-sunken/60 px-4 py-6 text-center text-muted">
          Henüz listeniz yok. Listeler, kişileri otomasyonlara göre gruplamanızı sağlar (örn. &ldquo;Kadıköy diş klinikleri&rdquo;).
        </p>
      ) : (
        <ul className="grid gap-2">
          {lists.map((l) => (
            <li key={l.id} className="flex items-center gap-3 rounded-row px-4 py-3 ring-1 ring-line">
              <button type="button" onClick={() => onOpen(l.id)} className="grid min-w-0 flex-1 gap-0.5 text-left">
                <span className="truncate font-medium">{l.name}</span>
                <span className="text-sm text-muted">{l.count} kişi</span>
              </button>
              <button
                type="button"
                aria-label={`${l.name} listesini sil`}
                onClick={() => void remove(l)}
                className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-danger"
              >
                <TrashIcon size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Kara liste: bu adreslere hiçbir otomasyon e-posta göndermez. */
export function SuppressionsView({ items, onChanged }: { items: Suppression[]; onChanged: () => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const v = value.trim();
    if (!v || busy) return;
    setBusy(true);
    setError(null);
    const r = await api<{ ok: true }>("/api/outreach/suppressions", { method: "POST", body: JSON.stringify({ value: v }) });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setValue("");
    onChanged();
    toast("Kara listeye eklendi");
  }

  async function remove(s: Suppression) {
    const r = await api<{ ok: true }>(`/api/outreach/suppressions/${s.id}`, { method: "DELETE" });
    if (!r.ok) return toast(r.error, { kind: "error" });
    onChanged();
    toast("Kara listeden çıkarıldı");
  }

  return (
    <div className="grid gap-5">
      <p className="max-w-[44rem] text-muted">
        Kara listedeki adreslere hiçbir otomasyon e-posta göndermez. Abonelikten çıkanlar ve geçersiz çıkan adresler buraya otomatik eklenir; bir firmanın tüm
        adreslerini engellemek için alan adını (örn. <span className="font-medium text-ink">firma.com</span>) yazın.
      </p>
      <form
        className="grid gap-2 sm:max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <div className="flex gap-2">
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            maxLength={254}
            aria-label="Kara listeye eklenecek e-posta ya da alan adı"
            aria-invalid={error ? true : undefined}
            placeholder="ali@firma.com ya da firma.com"
            className="h-11 min-w-0 flex-1 rounded-control bg-surface px-3.5 ring-1 ring-line-strong ring-inset outline-none placeholder:text-muted focus:ring-2 focus:ring-forest aria-invalid:ring-danger"
          />
          <Button type="submit" disabled={busy || value.trim().length < 3}>
            Ekle
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </form>

      {items.length === 0 ? (
        <p className="rounded-row bg-sunken/60 px-4 py-6 text-center text-muted">Kara listeniz boş.</p>
      ) : (
        <ul className="grid gap-2">
          {items.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-row px-4 py-3 ring-1 ring-line">
              <div className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate font-medium">{s.email ?? `@${s.domain}`}</span>
                <span className="text-sm text-muted">
                  {reasonLabels[s.reason]} · {new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(s.createdAt))}
                </span>
              </div>
              <button
                type="button"
                aria-label={`${s.email ?? s.domain} adresini kara listeden çıkar`}
                onClick={() => void remove(s)}
                className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-danger"
              >
                <TrashIcon size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
