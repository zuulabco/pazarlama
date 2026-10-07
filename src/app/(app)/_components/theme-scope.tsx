"use client";

import { useEffect } from "react";
import { applyTheme, storedTheme } from "@/lib/theme";

/**
 * Panele girildiğinde kayıtlı temayı uygular; panelden çıkılınca (örn. çıkış yapınca) marka sayfaları
 * açık temada kalsın diye kaldırır.
 */
export function ThemeScope() {
  useEffect(() => {
    applyTheme(storedTheme());
    return () => applyTheme("light");
  }, []);
  return null;
}
