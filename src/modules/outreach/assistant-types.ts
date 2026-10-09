/** Adspine AI'nın sohbet dışında yaptığı işler (sunucu üretir, istemci gösterir ve uygular). */
export type AssistantAction =
  /** Takvime plan eklendi (geri alınabilir). */
  | { type: "plan"; id: string; title: string; kind: string; startsAt: string; allDay: boolean; when: string; withName: string | null; location: string | null }
  /** Bir sayfaya git (isteğe bağlı olarak orada bir işi başlatır, örn. müşteri araması). */
  | { type: "go"; path: string; label: string; detail?: string };

export type AssistantAnswer = { reply: string; links: { path: string; label: string }[]; action?: AssistantAction };
