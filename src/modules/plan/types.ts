import { z } from "zod";

/** Plan öğesinin türü. Sunucu ve istemci ortak kullanır. */
export const planKinds = [
  { value: "randevu", label: "Randevu" },
  { value: "toplanti", label: "Toplantı" },
  { value: "arama", label: "Arama" },
  { value: "gorev", label: "Görev" },
  { value: "not", label: "Not" },
] as const;
export type PlanKind = (typeof planKinds)[number]["value"];
export const planKindValues = planKinds.map((k) => k.value) as [PlanKind, ...PlanKind[]];

export const kindLabel = (kind: PlanKind) => planKinds.find((k) => k.value === kind)?.label ?? kind;

export type PlanItem = {
  id: string;
  kind: PlanKind;
  title: string;
  details: string;
  /** ISO 8601 (UTC). Tüm gün öğelerinde, kullanıcının yerel gününün başlangıcıdır. */
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  favoriteId: string | null;
  withName: string | null;
  location: string | null;
  done: boolean;
};

/** Bir öğe en çok bu kadar gün sürebilir (takvimde her güne çizilir). */
export const maxSpanDays = 14;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `En fazla ${max} karakter.`)
    .nullish()
    .transform((v) => v || null);

const nullable = <T extends z.ZodType>(t: T) => t.nullish().transform((v) => v ?? null);

/** Alanların kuralları; varsayılan değer yok (kısmi güncelleme eksik alanı değiştirmesin diye). */
const fields = {
  kind: z.enum(planKindValues),
  title: z.string().trim().min(1, "Bir başlık yazın.").max(120, "En fazla 120 karakter."),
  details: z.string().trim().max(1000, "En fazla 1000 karakter."),
  startsAt: z.iso.datetime({ offset: true, error: "Geçerli bir tarih seçin." }),
  endsAt: nullable(z.iso.datetime({ offset: true })),
  allDay: z.boolean(),
  favoriteId: nullable(z.uuid()),
  withName: optionalText(80),
  location: optionalText(160),
  done: z.boolean(),
};

const spanOk = (v: { startsAt?: string; endsAt?: string | null }) => {
  if (!v.endsAt || !v.startsAt) return true;
  const span = Date.parse(v.endsAt) - Date.parse(v.startsAt);
  return span >= 0 && span <= maxSpanDays * 86_400_000;
};
const spanIssue = { path: ["endsAt"], message: "Bitiş, başlangıçtan sonra olmalı (en çok 14 gün)." };

export const planInputSchema = z
  .object({ ...fields, details: fields.details.default(""), allDay: fields.allDay.default(false), done: fields.done.default(false) })
  .refine(spanOk, spanIssue);
/** Kısmi güncelleme: yalnızca verilen alanlar değişir. */
export const planPatchSchema = z.object(fields).partial().refine(spanOk, spanIssue);
export type PlanInput = z.infer<typeof planInputSchema>;
