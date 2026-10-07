import { z } from "zod";
import { cityScopes, companySizes, dealValues, values } from "./options";

/**
 * Hizmet, sektör, şehir, kanal, işaret ve çalışma biçimi serbest metne açıktır: listedeki seçenekler
 * "slug" olarak, kullanıcının kendi yazdıkları olduğu gibi saklanır (labelOf, bilinmeyen değeri aynen gösterir).
 */
const tag = z.string().trim().min(2, "En az 2 karakter yazın.").max(40, "En fazla 40 karakter.");

const field = {
  businessName: z.string().trim().min(2, "İşletme veya marka adınızı yazın.").max(80, "En fazla 80 karakter."),
  workType: z.string().trim().min(2, "Nasıl çalıştığınızı seçin ya da yazın.").max(40, "En fazla 40 karakter."),
  businessDescription: z.string().trim().max(500, "En fazla 500 karakter.").default(""),
  services: z.array(tag).min(1, "En az bir hizmet seçin ya da yazın.").max(12, "En fazla 12 hizmet ekleyebilirsiniz."),
  targetSectors: z.array(tag).min(1, "En az bir sektör seçin ya da yazın.").max(12, "En fazla 12 sektör ekleyebilirsiniz."),
  targetSize: z.enum(values(companySizes), "Bir seçenek belirleyin."),
  cityScope: z.enum(values(cityScopes), "Bir seçenek belirleyin."),
  targetCities: z.array(tag).max(12, "En fazla 12 şehir ekleyebilirsiniz."),
  channels: z.array(tag).min(1, "En az bir kanal seçin ya da yazın.").max(8, "En fazla 8 kanal ekleyebilirsiniz."),
  dealValue: z.enum(values(dealValues), "Bir seçenek belirleyin."),
  signals: z.array(tag).max(8, "En fazla 8 işaret ekleyebilirsiniz."),
  signalNotes: z.string().trim().max(500, "En fazla 500 karakter.").default(""),
};

type Cross = { cityScope?: string; targetCities?: string[]; signals?: string[]; signalNotes?: string };
type Check = [(v: Cross) => boolean, { path: string[]; message: string }];

const citiesWhenScoped: Check = [
  (v) => v.cityScope !== "cities" || (v.targetCities?.length ?? 0) > 0,
  { path: ["targetCities"], message: "En az bir şehir seçin ya da yazın." },
];

const signalOrNotes: Check = [
  (v) => (v.signals?.length ?? 0) > 0 || (v.signalNotes?.trim().length ?? 0) >= 3,
  { path: ["signals"], message: "En az bir işaret seçin ya da aşağıya kendi cümlelerinizle yazın." },
];

export const stepSchemas = {
  about: z.object({
    businessName: field.businessName,
    workType: field.workType,
    businessDescription: field.businessDescription,
  }),
  target: z.object({ services: field.services, targetSectors: field.targetSectors, targetSize: field.targetSize }),
  reach: z
    .object({
      cityScope: field.cityScope,
      targetCities: field.targetCities,
      channels: field.channels,
      dealValue: field.dealValue,
    })
    .refine(...citiesWhenScoped),
  fit: z.object({ signals: field.signals, signalNotes: field.signalNotes }).refine(...signalOrNotes),
} as const;

export const profileSchema = z
  .object(field)
  .refine(...citiesWhenScoped)
  .refine(...signalOrNotes);

export type ProfileInput = z.infer<typeof profileSchema>;
