import "server-only";
import { db } from "@/lib/supabase/server";
import { addSuppression } from "./contacts";
import { verifyShortEnrollmentToken, verifyToken } from "./crypto";
import { addEvent, finishContactEnrollments } from "./enrollments";

/**
 * Abonelikten çıkma: bağlantıdaki imzalı jetondan kayıt (enrollment) bulunur; kişinin e-postası kara listeye alınır ve
 * kişinin tüm etkin otomasyon kayıtları bitirilir. İşlem tekrar çağrılsa da aynı sonucu verir (idempotent).
 */

type Target = { uid: string; contactId: string; sequenceId: string; email: string };

async function resolve(token: string): Promise<Target | null> {
  // Yeni kısa jeton; daha önce gönderilmiş e-postalardaki eski uzun jeton da çalışmaya devam eder.
  const payload = verifyShortEnrollmentToken(token) ? null : verifyToken(token);
  const id = verifyShortEnrollmentToken(token) ?? (payload?.startsWith("e:") ? payload.slice(2) : null);
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data: en } = await db().from("outreach_enrollments").select("user_uid, contact_id, sequence_id").eq("id", id).maybeSingle();
  if (!en) return null;
  const { data: c } = await db().from("outreach_contacts").select("email").eq("id", en.contact_id).maybeSingle();
  if (!c?.email) return null;
  return { uid: en.user_uid as string, contactId: en.contact_id as string, sequenceId: en.sequence_id as string, email: c.email as string };
}

/** "ayse.demir@lale.com" → "a***@lale.com": sayfada adresi tam göstermeden hangi adres olduğunu belli eder. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  return at < 1 ? "***" : `${email[0]}***${email.slice(at)}`;
}

/** Jetonun geçerli olup olmadığını ve (maskeli) adresi döndürür; sayfa göstermek için. */
export async function previewUnsubscribe(token: string): Promise<{ email: string } | null> {
  const t = await resolve(token);
  return t ? { email: maskEmail(t.email) } : null;
}

export async function applyUnsubscribe(token: string): Promise<boolean> {
  const t = await resolve(token);
  if (!t) return false;
  await addSuppression(t.uid, { email: t.email, reason: "abonelik" });
  await finishContactEnrollments(t.uid, t.contactId, "abonelik");
  await addEvent({ uid: t.uid, kind: "abonelik", sequenceId: t.sequenceId, contactId: t.contactId });
  return true;
}
