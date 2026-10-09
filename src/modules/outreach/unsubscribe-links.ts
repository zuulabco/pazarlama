import "server-only";
import { site } from "@/lib/site";
import { shortEnrollmentToken } from "./crypto";

/** Bir otomasyon kaydı için abonelik bağlantıları: insanlar için kısa sayfa adresi ve `List-Unsubscribe` başlığındaki tek tık adresi. */
export function unsubscribeLinks(enrollmentId: string) {
  const token = shortEnrollmentToken(enrollmentId);
  return { unsubscribeUrl: `${site.url}/u/${token}`, oneClickUrl: `${site.url}/api/outreach/unsub/${token}` };
}
