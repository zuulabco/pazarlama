import type { FinishReason } from "./enrollments";

/** Kişinin diziden çıkış nedenleri (istemci ve sunucu ortak; sunucuya özel kod içermez). */
export const finishLabels: Record<FinishReason, string> = {
  tamamlandi: "Tüm adımlar tamamlandı",
  yanit: "Yanıt verdi",
  abonelik: "Abonelikten çıktı",
  bounce: "E-posta geri döndü",
  sikayet: "Şikâyet etti",
  tiklama: "Bağlantıya tıkladı",
  yanitsiz: "Yanıt vermedi",
  elle: "Elle durduruldu",
  gecersiz: "Geçersiz adres",
  kara_liste: "Kara listede",
};
