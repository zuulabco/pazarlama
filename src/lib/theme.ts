"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "./theme-script";

/**
 * Panel teması (açık/koyu). Kaynak, <html data-theme="dark"> özniteliğidir; seçim localStorage'da
 * saklanır. Seçim yoksa cihazın tercihi kullanılır. Marka sayfaları her zaman açık temadadır.
 * İlk boyamada yanıp sönmeyi önleyen betik `theme-script.ts` içindedir.
 */
const KEY = THEME_KEY;
const EVENT = "sinyal-theme";

export type Theme = "light" | "dark";

export function storedTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "dark" || v === "light") return v;
  } catch {
    // Depolama kapalıysa cihaz tercihi kullanılır.
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  window.dispatchEvent(new Event(EVENT));
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Kaydedilemese de bu oturumda uygulanır.
  }
  applyTheme(theme);
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};

/** Geçerli temayı okur; sunucuda her zaman "light". */
export function useTheme(): Theme {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"),
    () => "light",
  );
}
