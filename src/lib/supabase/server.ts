import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/**
 * Yalnızca sunucuda kullanılır (service_role, RLS'i atlar).
 * Güvenlik kuralı: bu istemciyle yapılan HER sorgu oturumdaki kullanıcıya
 * (user_uid / firebase_uid) göre filtrelenmelidir. Ham sorguları doğrudan sayfalara
 * yazmak yerine src/modules/** altındaki repository fonksiyonlarını kullanın.
 */
export function db(): SupabaseClient {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
