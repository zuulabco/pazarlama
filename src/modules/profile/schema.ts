import { z } from "zod";
import { companySizes, dealValues, sectors, services, values, workTypes } from "./options";

const cityList = z
  .array(z.string().trim().min(2, "Şehir adı çok kısa.").max(40, "Şehir adı çok uzun."))
  .min(1, "En az bir şehir ekleyin.")
  .max(10, "En fazla 10 şehir ekleyebilirsiniz.");

export const stepSchemas = {
  about: z.object({
    businessName: z.string().trim().min(2, "İşletme veya marka adınızı yazın.").max(80, "En fazla 80 karakter."),
    workType: z.enum(values(workTypes), "Bir seçenek belirleyin."),
  }),
  offer: z.object({
    services: z.array(z.enum(values(services))).min(1, "En az bir hizmet seçin.").max(9),
  }),
  audience: z.object({
    targetSectors: z.array(z.enum(values(sectors))).min(1, "En az bir sektör seçin.").max(12),
    targetCities: cityList,
    targetSize: z.enum(values(companySizes), "Bir seçenek belirleyin."),
  }),
  deal: z.object({
    dealValue: z.enum(values(dealValues), "Bir seçenek belirleyin."),
  }),
} as const;

export const profileSchema = z.object({
  ...stepSchemas.about.shape,
  ...stepSchemas.offer.shape,
  ...stepSchemas.audience.shape,
  ...stepSchemas.deal.shape,
});

export type ProfileInput = z.infer<typeof profileSchema>;
