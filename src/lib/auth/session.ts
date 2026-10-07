import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE } from "./constants";

export type SessionUser = {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
};

/** İstek başına bir kez doğrular; geçersiz ya da süresi dolmuş cookie'de null döner. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    // checkRevoked: çıkış yapılan (veya şifresi değişen) hesabın eski cookie'leri de reddedilir.
    const token = await adminAuth().verifySessionCookie(value, true);
    return {
      uid: token.uid,
      email: token.email ?? null,
      name: (token.name as string | undefined) ?? null,
      picture: token.picture ?? null,
    };
  } catch {
    return null;
  }
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  return user;
}
