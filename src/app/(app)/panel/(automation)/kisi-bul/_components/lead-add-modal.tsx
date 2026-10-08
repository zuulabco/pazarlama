"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { skippedLabels } from "@/modules/outreach/lead-options";
import type { ContactList } from "@/modules/outreach/contacts";
import type { SequenceSummary } from "@/modules/outreach/sequence-schema";
import { api } from "../../kisiler/_components/contact-ui";

const num = (n: number) => new Intl.NumberFormat("tr-TR").format(n);

type Result = { added: number; skipped: Record<string, number>; listName: string | null; credits: number };

/**
 * "Kişileri ekle ve e-posta bul" penceresi (Instantly'nin "Find Emails & Enrich" penceresinin karşılığı):
 * ne alınacağı, sonuçların hangi listeye gideceği, kredi özeti ve onay. Başarıdan sonra kampanyaya ekleme önerilir.
 */
export function LeadAddModal({
  open,
  onClose,
  searchId,
  rids,
  credits,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  searchId: string;
  rids: number[];
  credits: number;
  onDone: (credits: number) => void;
}) {
  const [lists, setLists] = useState<ContactList[] | null>(null);
  const [listId, setListId] = useState("yeni");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(Result & { listId: string | null }) | null>(null);
  const [campaigns, setCampaigns] = useState<SequenceSummary[] | null>(null);
  const [campaignId, setCampaignId] = useState("");
  const [enrolled, setEnrolled] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    void api<{ lists: ContactList[] }>("/api/outreach/lists").then((r) => live && r.ok && setLists(r.data.lists));
    return () => {
      live = false;
    };
  }, [open]);

  const need = rids.length;
  const enough = credits >= need;

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await api<Result>(`/api/outreach/leads/browse/${searchId}/reveal`, { method: "POST", body: JSON.stringify({ rids, listId: listId === "yeni" ? null : listId }) });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    onDone(r.data.credits);
    // Kampanyaya eklemek için eklenen listenin kimliğini bul (otomatik oluşturulan listeler adıyla bulunur).
    const all = await api<{ lists: ContactList[] }>("/api/outreach/lists");
    const list = all.ok ? (listId === "yeni" ? all.data.lists.find((l) => l.name === r.data.listName) : all.data.lists.find((l) => l.id === listId)) : undefined;
    setResult({ ...r.data, listId: list?.id ?? null });
    const seq = await api<{ sequences: SequenceSummary[] }>("/api/outreach/sequences");
    if (seq.ok) {
      const usable = seq.data.sequences.filter((s) => s.status !== "arsiv");
      setCampaigns(usable);
      setCampaignId(usable[0]?.id ?? "");
    }
  }

  async function enroll() {
    if (!result?.listId || !campaignId || busy) return;
    setBusy(true);
    const r = await api<{ added: number }>(`/api/outreach/sequences/${campaignId}/contacts`, { method: "POST", body: JSON.stringify({ listId: result.listId }) });
    setBusy(false);
    if (!r.ok) return toast(r.error, { kind: "error" });
    setEnrolled(r.data.added);
    toast(`${r.data.added} kişi kampanyaya eklendi`);
  }

  function close() {
    setResult(null);
    setError(null);
    setEnrolled(null);
    setListId("yeni");
    onClose();
  }

  const skipped = result ? Object.entries(result.skipped).filter(([, n]) => n) : [];

  return (
    <Modal open={open} onClose={close} title={result ? "Kişiler eklendi" : "Kişileri ekle ve e-posta bul"}>
      {!result ? (
        <div className="grid gap-4">
          <ul className="grid gap-2.5 text-sm">
            <li className="flex items-center justify-between gap-4 rounded-row bg-sunken/60 px-4 py-3">
              <span className="grid gap-0.5">
                <span className="font-medium">İş e-postası</span>
                <span className="text-muted">Alan adı denetlenir; geçersiz olanlar eklenmez.</span>
              </span>
              <span className="shrink-0 font-medium tabular-nums">1 kredi / kişi</span>
            </li>
            <li className="flex items-center justify-between gap-4 rounded-row bg-sunken/60 px-4 py-3">
              <span className="grid gap-0.5">
                <span className="font-medium">Ad, unvan, şirket ve LinkedIn</span>
                <span className="text-muted">Profil bilgileri kişiyle birlikte gelir.</span>
              </span>
              <span className="shrink-0 font-medium text-accent">Ücretsiz</span>
            </li>
          </ul>

          <div className="grid gap-1.5 text-sm font-medium">
            Kişilerin kaydedileceği liste
            <Select<string>
              label="Liste"
              value={listId}
              options={[{ value: "yeni", label: "Yeni liste (otomatik oluşturulur)" }, ...(lists ?? []).map((l) => ({ value: l.id, label: l.name, hint: `${l.count} kişi` }))]}
              onChange={setListId}
            />
          </div>

          <div className="grid gap-1 rounded-row ring-1 ring-line px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Seçilen kişi</span>
              <span className="font-medium tabular-nums">{num(need)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">En çok düşecek kredi</span>
              <span className="font-medium tabular-nums">{num(need)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Kalan krediniz</span>
              <span className={`font-medium tabular-nums ${enough ? "" : "text-danger"}`}>{num(credits)}</span>
            </div>
          </div>
          <p className="text-sm text-muted">Yalnızca gerçekten eklenen kişiler için kredi düşer; e-postası geçersiz ya da zaten kayıtlı olanlar için düşmez.</p>

          {!enough && (
            <p role="alert" className="text-sm text-danger">
              Krediniz yetmiyor. Daha az kişi seçin; krediniz ay başında yenilenir.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="quiet" onClick={close}>
              Vazgeç
            </Button>
            <Button onClick={() => void confirm()} disabled={busy || !enough}>
              {busy ? "Ekleniyor…" : `${num(need)} kişiyi ekle · ${num(need)} kredi`}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-1">
            <p className="text-xl font-semibold tracking-tight">{result.added > 0 ? `${num(result.added)} kişi eklendi` : "Yeni kişi eklenmedi"}</p>
            <p className="text-sm text-muted">
              {result.listName ? `Kişiler “${result.listName}” listesine konuldu. ` : ""}Kalan krediniz: {num(result.credits)}.
              {skipped.length > 0 ? ` Atlananlar: ${skipped.map(([k, n]) => `${n} ${skippedLabels[k as keyof typeof skippedLabels]}`).join(", ")}.` : ""}
            </p>
          </div>

          {result.added > 0 && result.listId && (
            <div className="grid gap-3 rounded-row bg-forest-soft/50 p-4">
              <h3 className="font-medium">Sıradaki adım: kampanyaya ekleyin</h3>
              {campaigns === null ? (
                <p className="text-sm text-muted">Kampanyalar yükleniyor…</p>
              ) : campaigns.length === 0 ? (
                <p className="text-sm text-muted">Henüz kampanyanız yok. Kampanyalar sayfasında Adspine AI ile bir e-posta dizisi oluşturup bu listeyi ekleyebilirsiniz.</p>
              ) : enrolled !== null ? (
                <p className="text-sm font-medium text-accent">{num(enrolled)} kişi kampanyaya eklendi.</p>
              ) : (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="grid min-w-[12rem] flex-1 gap-1.5 text-sm font-medium">
                    Kampanya
                    <Select<string> label="Kampanya" value={campaignId} options={campaigns.map((c) => ({ value: c.id, label: c.name }))} onChange={setCampaignId} />
                  </div>
                  <Button onClick={() => void enroll()} disabled={busy || !campaignId}>
                    Kampanyaya ekle
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link href="/panel/kisiler" className="text-sm text-accent underline underline-offset-4 hover:no-underline">
              Kişilere git
            </Link>
            <Button onClick={close}>Tamam</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
