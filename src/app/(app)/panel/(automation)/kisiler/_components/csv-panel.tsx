"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { csvToContacts, type CsvField } from "@/modules/outreach/csv";
import { maxImportRows } from "@/modules/outreach/schema";
import { api } from "./contact-ui";

const fieldLabels: Record<CsvField, string> = { name: "Ad", company: "Firma", email: "E-posta", phone: "Telefon", website: "Web sitesi", city: "Şehir" };

type Parsed = { fileName: string; rows: Partial<Record<CsvField, string>>[]; recognized: CsvField[] };

/** CSV içe aktarma: dosyayı tarayıcıda okur, hangi sütunların tanındığını gösterir, onayla aktarır. */
export function CsvPanel({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function read(file: File) {
    setError(null);
    setParsed(null);
    if (file.size > 2_000_000) return setError("Dosya çok büyük (en fazla 2 MB).");
    const result = csvToContacts(await file.text());
    if (result.rows.length === 0) return setError("Dosyada tanınan bir sütun yok. İlk satırda “Firma”, “E-posta”, “Telefon” gibi başlıklar olmalı.");
    setParsed({ fileName: file.name, ...result });
  }

  async function upload() {
    if (!parsed || busy) return;
    setBusy(true);
    let added = 0;
    let skipped = 0;
    let invalid = 0;
    for (let i = 0; i < parsed.rows.length; i += maxImportRows) {
      const r = await api<{ added: number; skipped: number; invalid: number }>("/api/outreach/contacts/import", {
        method: "POST",
        body: JSON.stringify({ source: "csv", rows: parsed.rows.slice(i, i + maxImportRows) }),
      });
      if (!r.ok) {
        setBusy(false);
        return toast(r.error, { kind: "error" });
      }
      added += r.data.added;
      skipped += r.data.skipped;
      invalid += r.data.invalid;
    }
    setBusy(false);
    toast(`${added} kişi eklendi${skipped ? `, ${skipped} tanesi zaten kayıtlıydı` : ""}${invalid ? `, ${invalid} satır geçersizdi` : ""}`);
    onDone();
  }

  const withEmail = parsed?.rows.filter((r) => r.email).length ?? 0;
  return (
    <div className="grid gap-4">
      <h3 className="text-lg font-semibold tracking-tight">CSV içe aktar</h3>
      <p className="text-sm text-muted">
        Excel ya da Google E-Tablolar&apos;dan dışa aktardığınız .csv dosyasını yükleyin. İlk satır başlık olmalı (Firma, Ad, E-posta, Telefon, Web sitesi, Şehir).
        E-postası olmayan firmaların e-postalarını sonra siteden bulabilirsiniz.
      </p>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv,text/plain"
        className="sr-only"
        aria-label="CSV dosyası seç"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void read(f);
          e.target.value = "";
        }}
      />
      <Button variant="secondary" onClick={() => input.current?.click()} className="w-fit">
        Dosya seç
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {parsed && (
        <div className="grid gap-3 rounded-row bg-sunken/60 p-4 text-sm">
          <p className="font-medium">{parsed.fileName}</p>
          <p>
            {parsed.rows.length} satır · {withEmail} tanesinde e-posta var
          </p>
          <p className="text-muted">Tanınan sütunlar: {parsed.recognized.map((f) => fieldLabels[f]).join(", ")}</p>
          <ul className="grid gap-1 text-muted">
            {parsed.rows.slice(0, 3).map((r, i) => (
              <li key={i} className="truncate">
                {[r.company, r.name, r.email].filter(Boolean).join(" · ") || "(boş satır)"}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void upload()} disabled={!parsed || busy}>
          {busy ? "Aktarılıyor…" : parsed ? `${parsed.rows.length} satırı aktar` : "İçe aktar"}
        </Button>
        <Button variant="quiet" onClick={onCancel} disabled={busy}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
