export type Draft = {
  businessName: string;
  workType: string;
  businessDescription: string;
  services: string[];
  targetSectors: string[];
  targetSizes: string[];
  cityScope: string;
  targetCities: string[];
  channels: string[];
  dealValue: string;
  signals: string[];
  signalNotes: string;
};

export const emptyDraft: Draft = {
  businessName: "",
  workType: "",
  businessDescription: "",
  services: [],
  targetSectors: [],
  targetSizes: [],
  cityScope: "",
  targetCities: [],
  channels: [],
  dealValue: "",
  signals: [],
  signalNotes: "",
};

/** Kayıtlı (eski ya da yarım) cevaplardan, yalnızca bilinen alanları alır. */
export function draftFrom(initial: Partial<Draft>): Draft {
  const draft: Draft = { ...emptyDraft };
  for (const key of Object.keys(emptyDraft) as (keyof Draft)[]) {
    const value = initial[key];
    if (value !== undefined) (draft[key] as Draft[typeof key]) = value;
  }
  return draft;
}
