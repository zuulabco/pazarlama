import type { User } from "firebase/auth";

/** Yalnızca site içi yollara yönlendir (açık yönlendirme açığını önler). */
export function nextPath(fallback = "/panel") {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

/** Firebase kullanıcısının ID token'ıyla sunucudan oturum çerezi alır; hesap kurulumunun tamamlanıp tamamlanmadığını döndürür. */
export async function startSession(user: User): Promise<boolean> {
  const idToken = await user.getIdToken();
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Oturum açılamadı, tekrar deneyin.");
  }
  const body = (await res.json().catch(() => null)) as { onboarded?: boolean } | null;
  return body?.onboarded !== false;
}
