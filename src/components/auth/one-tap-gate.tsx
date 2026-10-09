import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth/session";
import { GoogleOneTap } from "./google-one-tap";

async function Gate() {
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return null;
  return (await getSessionUser()) ? null : <GoogleOneTap />;
}

/** Yalnızca giriş yapmamış ziyaretçiye Google One Tap kutusunu gösterir (oturum çerezi sunucuda denetlenir). */
export function OneTapGate() {
  return (
    <Suspense>
      <Gate />
    </Suspense>
  );
}
