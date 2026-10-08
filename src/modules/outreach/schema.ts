import { z } from "zod";
import { cleanEmail, isPlausibleEmail } from "./discover/emails";
import type { EmailKind } from "./discover/emails";
import type { EmailStatus } from "./discover/verify-rules";

/** Kişi alanları ve kuralları (sunucu ve istemci ortak). */

export type ContactSource = "elle" | "csv" | "takip" | "arama" | "kisi_bul";

export type Contact = {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  emailStatus: EmailStatus;
  emailKind: EmailKind | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  /** Kişinin unvanı ("Kişi bul" ile gelen kayıtlarda dolu). */
  jobTitle: string | null;
  linkedinUrl: string | null;
  source: ContactSource;
  sourceUrl: string | null;
  favoriteId: string | null;
  foundAt: string | null;
  discoveryNote: string | null;
  discoveredAt: string | null;
  createdAt: string;
  lists: { id: string; name: string }[];
};

/** Kullanıcı başına en çok bu kadar kişi (kötüye kullanıma karşı). */
export const maxContacts = 5000;
export const maxImportRows = 500;

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `En fazla ${max} karakter.`)
    .nullish()
    .transform((v) => v || null);

const email = z
  .string()
  .trim()
  .max(254, "E-posta çok uzun.")
  .nullish()
  .transform((v) => (v ? cleanEmail(v) : null))
  .refine((v) => v === null || isPlausibleEmail(v), "Geçerli bir e-posta adresi yazın.");

export const contactInputSchema = z
  .object({
    name: text(120),
    company: text(160),
    email,
    phone: text(40),
    website: text(300),
    city: text(80),
  })
  .refine((v) => v.name || v.company || v.email, { message: "Ad, firma ya da e-postadan en az biri gerekli.", path: ["name"] });

export type ContactInput = z.infer<typeof contactInputSchema>;

export const contactPatchSchema = z
  .object({ name: text(120), company: text(160), email, phone: text(40), website: text(300), city: text(80) })
  .partial();

/** Satırlar tek tek doğrulanır (hatalı satır tüm aktarmayı bozmasın), bu yüzden burada ham bırakılır. */
export const importSchema = z.object({
  rows: z.array(z.unknown()).min(1, "Aktarılacak satır yok.").max(maxImportRows, `En fazla ${maxImportRows} satır aktarabilirsiniz.`),
});
