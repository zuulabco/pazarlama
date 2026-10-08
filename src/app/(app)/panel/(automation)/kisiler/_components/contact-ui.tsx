"use client";

import { kindLabels, statusLabels, type EmailStatus } from "@/modules/outreach/discover/verify-rules";
import type { EmailKind } from "@/modules/outreach/discover/emails";

/** Kişi tablosunda ve formlarda ortak küçük parçalar. */

const statusStyle: Record<EmailStatus, string> = {
  yok: "bg-sunken text-muted",
  bulundu: "bg-forest-soft text-forest",
  elle: "bg-sunken text-ink",
  riskli: "bg-pollen/60 text-ink",
  gecersiz: "bg-danger-soft text-danger",
};

export function StatusChip({ status }: { status: EmailStatus }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[status]}`}>{statusLabels[status]}</span>;
}

export function KindChip({ kind }: { kind: EmailKind | null }) {
  if (!kind || kind === "is") return null;
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs ${kind === "kisisel" ? "bg-pollen/40 text-ink" : "bg-sunken text-muted"}`}>
      {kindLabels[kind]}
    </span>
  );
}

export const sourceLabels = { elle: "Elle", csv: "CSV", takip: "Takip", arama: "Arama" } as const;

/** Tarayıcıda dosya indirir. */
export function download(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function api<T>(url: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  try {
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
    const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok || !body) return { ok: false, status: res.status, error: body?.error ?? "İşlem tamamlanamadı. Tekrar deneyin." };
    return { ok: true, data: body };
  } catch {
    return { ok: false, status: 0, error: "Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin." };
  }
}
