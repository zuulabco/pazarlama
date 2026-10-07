/** Sonuç sıralama seçenekleri ve süzgeç tipleri. Sunucu ve istemci tarafından ortak kullanılır. */
export const leadSorts = {
  score: { column: "lead_score", label: "Genel skor" },
  digital: { column: "digital_need", label: "Dijital ihtiyaç" },
  reach: { column: "reachability", label: "Ulaşılabilirlik" },
  priority: { column: "priority", label: "Öncelik" },
} as const;

export type LeadSort = keyof typeof leadSorts;

export type Presence = "var" | "yok";
