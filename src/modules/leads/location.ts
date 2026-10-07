import { fold } from "@/lib/text";
import { provinces } from "../profile/cities";
import districtData from "../profile/districts.json";

const districts = districtData as Record<string, string[]>;

/** İlin adını listedeki yazımıyla döndürür ("istanbul" → "İstanbul"); listede yoksa null. */
export function canonicalProvince(input: string): string | null {
  return provinces.find((p) => fold(p) === fold(input.trim())) ?? null;
}

export function districtsOf(province: string): readonly string[] {
  const key = canonicalProvince(province);
  return key ? (districts[key] ?? []) : [];
}

/** İlçenin adını o ildeki yazımıyla döndürür; il içinde yoksa null. */
export function canonicalDistrict(province: string, input: string): string | null {
  return districtsOf(province).find((d) => fold(d) === fold(input.trim())) ?? null;
}

/** Aramada kullanılan konum metni: "Kadıköy, İstanbul" ya da yalnızca "İstanbul". */
export function composeLocation(province: string, district?: string | null): string {
  return district ? `${district}, ${province}` : province;
}
