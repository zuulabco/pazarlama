/** Gelen kutusu durum etiketleri ve türleri (sunucu ve istemci ortak). */

export const leadStatuses = [
  { value: "lead", label: "Yeni yanıt" },
  { value: "ilgili", label: "İlgili" },
  { value: "toplanti", label: "Toplantı planlandı" },
  { value: "toplanti_yapildi", label: "Toplantı yapıldı" },
  { value: "kazanildi", label: "Kazanıldı" },
  { value: "ofis_disi", label: "Ofis dışı" },
  { value: "yanlis_kisi", label: "Yanlış kişi" },
  { value: "ilgisiz", label: "İlgisiz" },
  { value: "kaybedildi", label: "Kaybedildi" },
] as const;

export type LeadStatus = (typeof leadStatuses)[number]["value"];
export const leadStatusValues = leadStatuses.map((s) => s.value) as [LeadStatus, ...LeadStatus[]];
export const statusLabel = (s: LeadStatus) => leadStatuses.find((x) => x.value === s)?.label ?? s;

export type Conversation = {
  id: string; // enrollment id
  status: LeadStatus;
  unread: boolean;
  lastReplyAt: string;
  snippet: string;
  subject: string;
  contact: { id: string | null; name: string | null; company: string | null; email: string | null };
  campaign: { id: string | null; name: string | null };
  mailboxId: string | null;
};

export type ThreadMessage = {
  id: string;
  direction: "giden" | "gelen";
  kind: "yanit" | "ooo" | "kampanya" | "elle";
  from: string;
  subject: string;
  body: string;
  at: string;
};

export type InboxCounts = Record<LeadStatus, number> & { toplam: number; okunmamis: number };
