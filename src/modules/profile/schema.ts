import { z } from "zod";
import { channels, cityScopes, companySizes, dealValues, sectors, services, signals, values, workTypes } from "./options";

const field = {
  businessName: z.string().trim().min(2, "İşletme veya marka adınızı yazın.").max(80, "En fazla 80 karakter."),
  workType: z.enum(values(workTypes), "Bir seçenek belirleyin."),
  services: z.array(z.enum(values(services))).min(1, "En az bir hizmet seçin."),
  primaryService: z.enum(values(services), "En güçlü olduğunuz hizmeti seçin."),
  targetSectors: z.array(z.enum(values(sectors))).min(1, "En az bir sektör seçin."),
  targetSize: z.enum(values(companySizes), "Bir seçenek belirleyin."),
  cityScope: z.enum(values(cityScopes), "Bir seçenek belirleyin."),
  targetCities: z
    .array(z.string().trim().min(2, "Şehir adı çok kısa.").max(40, "Şehir adı çok uzun."))
    .max(12, "En fazla 12 şehir ekleyebilirsiniz."),
  signals: z.array(z.enum(values(signals))).min(1, "En az bir işaret seçin."),
  channels: z.array(z.enum(values(channels))).min(1, "En az bir kanal seçin."),
  dealValue: z.enum(values(dealValues), "Bir seçenek belirleyin."),
};

type Cross = { services?: string[]; primaryService?: string; cityScope?: string; targetCities?: string[] };

const primaryInServices: [(v: Cross) => boolean, { path: string[]; message: string }] = [
  (v: Cross) => !v.services || !v.primaryService || v.services.includes(v.primaryService),
  { path: ["primaryService"], message: "Seçtiğiniz hizmetlerden birini işaretleyin." },
];

const citiesWhenScoped: [(v: Cross) => boolean, { path: string[]; message: string }] = [
  (v: Cross) => v.cityScope !== "cities" || (v.targetCities?.length ?? 0) > 0,
  { path: ["targetCities"], message: "En az bir şehir ekleyin." },
];

export const stepSchemas = {
  about: z.object({ businessName: field.businessName, workType: field.workType }),
  offer: z.object({ services: field.services, primaryService: field.primaryService }).refine(...primaryInServices),
  audience: z.object({ targetSectors: field.targetSectors, targetSize: field.targetSize }),
  where: z.object({ cityScope: field.cityScope, targetCities: field.targetCities }).refine(...citiesWhenScoped),
  signals: z.object({ signals: field.signals }),
  reach: z.object({ channels: field.channels, dealValue: field.dealValue }),
} as const;

export const profileSchema = z.object(field).refine(...primaryInServices).refine(...citiesWhenScoped);

export type ProfileInput = z.infer<typeof profileSchema>;
