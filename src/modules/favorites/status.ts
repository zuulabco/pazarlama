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
