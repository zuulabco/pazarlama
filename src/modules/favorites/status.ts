/** Takipteki bir firmanın aşaması. Sunucu ve istemci ortak kullanır. */
export const followStatuses = [
  { value: "takipte", label: "Takipte" },
  { value: "iletisim", label: "İletişim kuruldu" },
  { value: "teklif", label: "Teklif verildi" },
  { value: "kazanildi", label: "Kazanıldı" },
  { value: "kaybedildi", label: "Kaybedildi" },
] as const;

export type FollowStatus = (typeof followStatuses)[number]["value"];

export const followStatusValues = followStatuses.map((s) => s.value) as [FollowStatus, ...FollowStatus[]];

/**
 * Arayüzde gösterilen sade aşamalar. Veritabanı beş değer tutar; eski kayıtlar bozulmasın diye
 * "teklif" görüşülüyor, "kaybedildi" ise sonuçlandı sayılır. Değiştirilen firma ana değerle kaydedilir.
 */
export const followStages = [
  { value: "takipte", label: "Takipte", includes: ["takipte"] },
  { value: "iletisim", label: "Görüşülüyor", includes: ["iletisim", "teklif"] },
  { value: "kazanildi", label: "Sonuçlandı", includes: ["kazanildi", "kaybedildi"] },
] as const satisfies readonly { value: FollowStatus; label: string; includes: readonly FollowStatus[] }[];

export type FollowStage = (typeof followStages)[number]["value"];

export function stageOf(status: FollowStatus): FollowStage {
  return (followStages.find((s) => (s.includes as readonly string[]).includes(status)) ?? followStages[0]).value;
}
