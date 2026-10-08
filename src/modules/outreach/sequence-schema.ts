import { z } from "zod";
import { defaultSchedule, type Schedule } from "./schedule";

/** Kampanya (e-posta dizisi) türleri ve kuralları (sunucu ve istemci ortak). */

export const stepKinds = [
  { value: "email", label: "Otomatik e-posta", auto: true },
  { value: "manual_email", label: "Manuel e-posta", auto: false },
  { value: "arama", label: "Arama", auto: false },
  { value: "gorev", label: "Görev", auto: false },
  { value: "whatsapp", label: "WhatsApp mesajı", auto: false },
] as const;
export type StepKind = (typeof stepKinds)[number]["value"];
export const stepKindValues = stepKinds.map((k) => k.value) as [StepKind, ...StepKind[]];
export const stepLabel = (kind: StepKind) => stepKinds.find((k) => k.value === kind)?.label ?? kind;

/** Mesajın nasıl yazıldığı: kendi şablonu, yönlendirmeli yapay zekâ ya da serbest istem. Üçü de sonunda düzenlenebilir bir şablon üretir. */
export type WriteMode = "sablon" | "asistan" | "istem";
export type EmailType = "tanisma" | "takip" | "son";
export const emailTypes = [
  { value: "tanisma", label: "Tanışma" },
  { value: "takip", label: "Takip" },
  { value: "son", label: "Son hatırlatma" },
] as const;

export type AiSettings = {
  type: EmailType;
  tone: "samimi" | "profesyonel" | "net";
  length: "kisa" | "standart" | "ayrintili";
  /** Asistanlı mod: kullanıcının "mesajda olsun" istekleri. İstem modunda serbest istem metni. */
  extra: string;
};

export type Variant = {
  key: "A" | "B" | "C";
  mode: WriteMode;
  subject: string;
  body: string;
  ai: AiSettings;
  /** Her kişi için, sitesinden okunanlara göre yapay zekânın yazdığı kişisel açılış cümlesi (gövdenin başına eklenir). */
  opener: boolean;
};

export type Step = {
  id: string;
  position: number;
  kind: StepKind;
  /** Önceki adımdan (ilk adımda kişi eklendikten) sonra kaç dakika beklenir. */
  delayMinutes: number;
  enabled: boolean;
  variants: Variant[];
  /** Manuel adımlar (arama, görev, WhatsApp, manuel e-posta) için görev başlığı ve notu. */
  task: { title: string; notes: string };
};

export type SequenceStatus = "taslak" | "aktif" | "duraklatildi" | "arsiv";

export type SequenceSettings = {
  /** Gönderimde kullanılabilecek posta kutuları; boşsa bağlı tüm kutular. */
  mailboxIds: string[];
  /** Kampanyanın kayan 24 saatlik üst sınırı (boşsa yalnızca posta kutusu limitleri). */
  maxPer24h: number | null;
  cc: string[];
  bcc: string[];
  trackOpens: boolean;
  trackClicks: boolean;
  includeSignature: boolean;
  /** Kişisel alan adlı (gmail vb.) adreslere de gönder. Varsayılan kapalı. */
  allowPersonal: boolean;
  /** Ofis dışı otomatik yanıtta kişiyi birkaç gün duraklat. */
  pauseOnOoo: boolean;
  /** Bağlantıya tıklayan kişiyi dizide bitir. */
  finishOnClick: boolean;
  /** Son adımdan N gün sonra yanıt yoksa kişiyi "yanıtsız" işaretle (boşsa kapalı). */
  unresponsiveDays: number | null;
  /** Alt bilgideki gönderici kimliği satırına eklenecek adres/telefon (ticari iletide gönderici bilgisi zorunludur). */
  footerAddress: string;
};

export const defaultSettings: SequenceSettings = {
  mailboxIds: [],
  maxPer24h: null,
  cc: [],
  bcc: [],
  trackOpens: false,
  trackClicks: false,
  includeSignature: true,
  allowPersonal: false,
  pauseOnOoo: true,
  finishOnClick: false,
  unresponsiveDays: null,
  footerAddress: "",
};

export type Sequence = {
  id: string;
  name: string;
  description: string;
  status: SequenceStatus;
  pausedReason: string | null;
  schedule: Schedule;
  settings: SequenceSettings;
  steps: Step[];
  createdAt: string;
  updatedAt: string;
};

export type SequenceSummary = Omit<Sequence, "steps"> & {
  stepCount: number;
  enrolled: number;
  active: number;
  sent: number;
  replied: number;
  bounced: number;
};

export const maxSteps = 10;
export const maxVariants = 3;

export const defaultAi: AiSettings = { type: "tanisma", tone: "samimi", length: "standart", extra: "" };

export const blankVariant = (key: Variant["key"] = "A", type: EmailType = "tanisma"): Variant => ({
  key,
  mode: "sablon",
  subject: "",
  body: "",
  ai: { ...defaultAi, type },
  opener: false,
});

// ─── doğrulama ────────────────────────────────────────────────────────────────

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Saat SS:DD biçiminde olmalı.");

export const scheduleSchema = z
  .object({
    tz: z.string().min(3).max(60).refine((tz) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Geçersiz saat dilimi."),
    days: z.array(z.number().int().min(1).max(7)).min(1, "En az bir gün seçin.").max(7),
    start: hhmm,
    end: hhmm,
  })
  .refine((s) => s.start < s.end, { message: "Bitiş saati başlangıçtan sonra olmalı.", path: ["end"] });

const emailList = z.array(z.string().trim().toLowerCase().regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Geçerli e-posta adresleri yazın.")).max(5);

export const settingsSchema = z.object({
  mailboxIds: z.array(z.uuid()).max(5),
  maxPer24h: z.number().int().min(1).max(2000).nullable(),
  cc: emailList,
  bcc: emailList,
  trackOpens: z.boolean(),
  trackClicks: z.boolean(),
  includeSignature: z.boolean(),
  allowPersonal: z.boolean(),
  pauseOnOoo: z.boolean(),
  finishOnClick: z.boolean(),
  unresponsiveDays: z.number().int().min(1).max(90).nullable(),
  footerAddress: z.string().trim().max(200),
});

export const variantSchema = z.object({
  key: z.enum(["A", "B", "C"]),
  mode: z.enum(["sablon", "asistan", "istem"]),
  subject: z.string().max(150, "Konu en fazla 150 karakter."),
  body: z.string().max(5000, "Mesaj en fazla 5000 karakter."),
  ai: z.object({
    type: z.enum(["tanisma", "takip", "son"]),
    tone: z.enum(["samimi", "profesyonel", "net"]),
    length: z.enum(["kisa", "standart", "ayrintili"]),
    extra: z.string().max(500),
  }),
  opener: z.boolean(),
});

export const stepSchema = z.object({
  /** Var olan adımın kimliği (günlük kayıtları adıma bağlı kalsın diye korunur); yeni adımda yok. */
  id: z.uuid().optional(),
  kind: z.enum(stepKindValues),
  delayMinutes: z.number().int().min(0).max(60 * 24 * 60),
  enabled: z.boolean(),
  variants: z.array(variantSchema).min(1).max(maxVariants),
  task: z.object({ title: z.string().max(120), notes: z.string().max(1000) }),
});

export const sequenceCreateSchema = z.object({
  name: z.string().trim().min(1, "Kampanyaya bir ad verin.").max(80, "En fazla 80 karakter."),
  description: z.string().trim().max(300).default(""),
});

export const sequenceUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Kampanyaya bir ad verin.").max(80),
    description: z.string().trim().max(300),
    schedule: scheduleSchema,
    settings: settingsSchema,
    /** Adımların tamamı sırayla gönderilir; sunucu hepsini yeniden yazar. */
    steps: z.array(stepSchema).max(maxSteps, `En fazla ${maxSteps} adım ekleyebilirsiniz.`),
  })
  .partial();

export { defaultSchedule };
