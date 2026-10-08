import { z } from "zod";
import type { DnsReport } from "./dns-health";
import type { Provider } from "./presets";

/** Gönderici adresi alanları ve kuralları (sunucu ve istemci ortak). */

export type Mailbox = {
  id: string;
  email: string;
  fromName: string | null;
  signature: string;
  provider: Provider;
  smtp: { host: string; port: number; secure: boolean };
  imap: { host: string; port: number; secure: boolean };
  username: string;
  status: "bagli" | "hata" | "duraklatildi";
  lastError: string | null;
  dailyLimit: number;
  hourlyLimit: number;
  warmupEnabled: boolean;
  warmupStartedAt: string | null;
  warmupScore: number | null;
  dnsCheck: DnsReport | null;
  dnsCheckedAt: string | null;
  createdAt: string;
};

/** Kullanıcı başına en çok bu kadar gönderici adresi (kötüye kullanıma karşı). */

const HOST = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/i;
const server = (ports: [number, ...number[]]) =>
  z.object({
    host: z.string().trim().toLowerCase().regex(HOST, "Geçerli bir sunucu adı yazın (örn. smtp.firma.com)."),
    port: z.number().int().refine((p) => ports.includes(p), `Port şunlardan biri olmalı: ${ports.join(", ")}.`),
    secure: z.boolean(),
  });

const emailField = z.string().trim().toLowerCase().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Geçerli bir e-posta adresi yazın.");

export const mailboxInputSchema = z.object({
  email: emailField,
  fromName: z
    .string()
    .trim()
    .max(80, "En fazla 80 karakter.")
    .nullish()
    .transform((v) => v || null),
  provider: z.enum(["gmail", "outlook", "ozel"]),
  username: z.string().trim().max(254).nullish().transform((v) => v || null),
  password: z.string().min(4, "Şifreyi yazın.").max(200),
  smtp: server([465, 587, 25, 2525]),
  imap: server([993, 143]),
  consent: z.literal(true, { error: "Devam etmek için onay kutusunu işaretleyin." }),
});
export type MailboxInput = z.infer<typeof mailboxInputSchema>;

export const mailboxPatchSchema = z
  .object({
    fromName: z.string().trim().max(80).nullable(),
    signature: z.string().trim().max(1000, "İmza en fazla 1000 karakter."),
    dailyLimit: z.number().int().min(1, "En az 1.").max(500, "En çok 500."),
    hourlyLimit: z.number().int().min(1, "En az 1.").max(100, "En çok 100."),
    status: z.enum(["bagli", "duraklatildi"]),
    /** Şifre değiştirilirse bağlantı yeniden sınanır. */
    password: z.string().min(4).max(200),
  })
  .partial();
