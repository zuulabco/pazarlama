import { FirebaseError } from "firebase/app";

const messages: Record<string, string> = {
  "auth/invalid-credential": "E-posta veya şifre hatalı.",
  "auth/wrong-password": "E-posta veya şifre hatalı.",
  "auth/user-not-found": "E-posta veya şifre hatalı.",
  "auth/invalid-email": "Geçerli bir e-posta adresi girin.",
  "auth/email-already-in-use": "Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin.",
  "auth/weak-password": "Şifre en az 8 karakter olmalı.",
  "auth/too-many-requests": "Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.",
  "auth/network-request-failed": "Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.",
  "auth/popup-blocked": "Tarayıcınız Google penceresini engelledi. Açılır pencerelere izin verip tekrar deneyin.",
  "auth/account-exists-with-different-credential":
    "Bu e-posta başka bir giriş yöntemiyle kayıtlı. O yöntemle giriş yapın.",
  "auth/user-disabled": "Bu hesap devre dışı bırakılmış.",
};

/** Kullanıcının kendi kapattığı Google penceresi bir hata sayılmaz. */
const silent = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

export function authErrorMessage(error: unknown): string | null {
  if (error instanceof FirebaseError) {
    if (silent.has(error.code)) return null;
    return messages[error.code] ?? "Bir sorun oluştu, tekrar deneyin.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Bir sorun oluştu, tekrar deneyin.";
}
