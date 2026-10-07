"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Tarayıcıda saklanan durum. Depolama kapalıysa (gizli pencere vb.) bellekte çalışmaya devam eder.
 * Sunucuda ve ilk çizimde `parse(null)` (varsayılan) kullanılır; böylece hidrasyon uyumsuzluğu olmaz.
 */
const listeners = new Set<() => void>();
const memory = new Map<string, string>();

function read(key: string) {
  const inMemory = memory.get(key);
  if (inMemory !== undefined) return inMemory;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    /* depolama kapalı: bellekteki kopya yeterli */
  }
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function decode<T>(raw: string | null, parse: (value: unknown) => T): T {
  try {
    return parse(raw ? JSON.parse(raw) : null);
  } catch {
    return parse(null);
  }
}

/** `parse` modül düzeyinde (kararlı) bir fonksiyon olmalıdır. */
export function useStoredState<T>(key: string, parse: (value: unknown) => T) {
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);
  const value = useMemo(() => decode(raw, parse), [raw, parse]);
  const update = useCallback(
    (updater: (previous: T) => T) => write(key, JSON.stringify(updater(decode(read(key), parse)))),
    [key, parse],
  );
  return [value, update] as const;
}
