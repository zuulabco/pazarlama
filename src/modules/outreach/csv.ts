import { fold } from "@/lib/text";

/** Küçük, bağımlılıksız CSV okuyucu/yazıcı (saf). Ayraç otomatik bulunur: virgül, noktalı virgül ya da sekme. */

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const first = src.split(/\r?\n/, 1)[0] ?? "";
  const delim = [";", "\t", ","].map((d) => ({ d, n: first.split(d).length })).sort((a, b) => b.n - a.n)[0].d;

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

export type CsvField = "name" | "company" | "email" | "phone" | "website" | "city";

const HEADERS: Record<CsvField, string[]> = {
  name: ["ad", "isim", "ad soyad", "adsoyad", "kisi", "yetkili", "name", "full name", "contact"],
  company: ["firma", "firma adi", "sirket", "sirket adi", "isletme", "unvan", "company", "business"],
  email: ["e-posta", "eposta", "e posta", "email", "e-mail", "mail", "mail adresi", "eposta adresi"],
  phone: ["telefon", "tel", "gsm", "cep", "phone", "mobile", "telefon numarasi"],
  website: ["web", "web sitesi", "website", "site", "url", "internet sitesi", "web adresi"],
  city: ["sehir", "il", "ilce", "konum", "city", "location", "bolge"],
};

/** Başlık satırından hangi sütunun hangi alana karşılık geldiğini bulur (Türkçe/İngilizce, büyük-küçük harf ve aksan duyarsız). */
export function mapHeaders(header: string[]): Partial<Record<CsvField, number>> {
  const map: Partial<Record<CsvField, number>> = {};
  header.forEach((h, i) => {
    const key = fold(h).trim();
    for (const [field, names] of Object.entries(HEADERS) as [CsvField, string[]][]) {
      if (map[field] === undefined && names.includes(key)) map[field] = i;
    }
  });
  return map;
}

/** CSV metnini kişi satırlarına çevirir. Başlık satırı yoksa (e-posta içeren ilk sütunu e-posta sayarak) sütun sırasına bakar. */
export function csvToContacts(text: string): { rows: Partial<Record<CsvField, string>>[]; recognized: CsvField[] } {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], recognized: [] };

  let map = mapHeaders(table[0]);
  let body = table.slice(1);
  if (Object.keys(map).length === 0) {
    // Başlıksız dosya: "@" içeren sütunu e-posta kabul et
    const col = table[0].findIndex((c) => c.includes("@"));
    if (col < 0) return { rows: [], recognized: [] };
    map = { email: col };
    body = table;
  }
  const fields = Object.keys(map) as CsvField[];
  const rows = body.map((r) => Object.fromEntries(fields.map((f) => [f, (r[map[f]!] ?? "").trim()])) as Partial<Record<CsvField, string>>);
  return { rows, recognized: fields };
}

const quote = (v: string) => (/[",;\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Satırları Excel'in Türkçe karakterleri doğru açması için BOM'lu CSV metnine çevirir. */
export function toCsv(header: string[], rows: string[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(quote).join(",")).join("\r\n") + "\r\n";
}
