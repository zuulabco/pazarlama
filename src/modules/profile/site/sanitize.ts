import { capitalize, fold } from "@/lib/text";
import { provinces } from "../cities";
import type { Draft } from "../draft";
import { companySizes, sectors, services, workTypes } from "../options";

/**
 * Dil modelinin döndürdüğü, güvenilmeyen JSON'u profil taslağına çevirir. Hazır seçeneklerle eşleşenler koda
 * çevrilir, eşleşmeyenler kısa bir ifade olarak korunur; uzunluk ve içerik sınırları uygulanır.
 * Böylece modelin ya da sitenin yazdığı bir şey, doğrulanmadan forma girmez.
 */

type Catalog = readonly { value: string; label: string }[];
type Raw = Record<string, unknown>;

const MAX_TAG = 40;

function plain(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/** Bir ifadeyi katalogdaki koda çevirir; katalogda yoksa, makul görünüyorsa kendisini döndürür. */
function resolve(catalog: Catalog, raw: unknown): string | null {
  const text = plain(raw);
  if (text.length < 2 || text.length > MAX_TAG || /[<>@{}]|https?:|www\./i.test(text)) return null;
  const key = fold(text);
  const hit = catalog.find((o) => o.value === text || fold(o.label) === key || fold(o.value) === key);
  if (hit) return hit.value;
  // Tireli, küçük harfli ASCII ("yazilim-bt") bir kod sızıntısıdır; başka listenin kodu olabilir, forma alınmaz.
  return /^[a-z\d]+(-[a-z\d]+)+$/.test(text) ? null : capitalize(text);
}

function resolveMany(catalog: Catalog, raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const v = resolve(catalog, item);
    if (v && !out.includes(v)) out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

export function draftFromAnalysis(raw: unknown, detectedChannels: readonly string[] = []): Partial<Draft> {
  const r: Raw = raw && typeof raw === "object" ? (raw as Raw) : {};
  const draft: Partial<Draft> = {};

  const name = plain(r.businessName);
  if (name.length >= 2 && name.length <= 80 && !/[<>{}]/.test(name)) draft.businessName = name;

  const workType = resolve(workTypes, r.workType);
  if (workType) draft.workType = workType;

  const description = plain(r.businessDescription);
  if (description.length >= 10) draft.businessDescription = description.length <= 500 ? description : description.slice(0, 500).replace(/\s+\S*$/, "");

  const svc = resolveMany(services, r.services, 8);
  if (svc.length) draft.services = svc;
  const sec = resolveMany(sectors, r.targetSectors, 6);
  if (sec.length) draft.targetSectors = sec;

  // Büyüklük yalnızca kodlardan oluşur; "fark etmez" diğerleriyle birlikte olmaz.
  const sizes = resolveMany(companySizes, r.targetSizes, 6).filter((s) => companySizes.some((c) => c.value === s));
  if (sizes.length) draft.targetSizes = sizes.includes("farketmez") ? ["farketmez"] : sizes;

  // Şehirler yalnızca bilinen illerden alınır; model uydurursa forma girmez.
  const cityKeys = Array.isArray(r.targetCities) ? r.targetCities.map((c) => fold(plain(c))) : [];
  const cities = provinces.filter((p) => cityKeys.includes(fold(p))).slice(0, 12);
  if (r.cityScope === "turkey") draft.cityScope = "turkey";
  else if (cities.length) {
    draft.cityScope = "cities";
    draft.targetCities = [...cities];
  }

  if (detectedChannels.length) draft.channels = [...detectedChannels];
  return draft;
}

/** Hangi alanların doldurulduğunu döndürür (arayüz bunları "sitenizden dolduruldu" diye işaretler). */
export function filledKeys(draft: Partial<Draft>): (keyof Draft)[] {
  return (Object.entries(draft) as [keyof Draft, unknown][])
    .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.length > 0))
    .map(([k]) => k);
}
