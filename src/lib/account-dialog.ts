"use client";

import { useSyncExternalStore } from "react";

/** Panelde açılabilen hesap pencereleri: plan seçimi ve ayarlar. Her yerden (menü, kullanım göstergesi) `openAccountDialog` ile açılır. */
export type AccountDialog = "planlar" | "ayarlar" | null;

let current: AccountDialog = null;
const listeners = new Set<() => void>();

export function openAccountDialog(next: Exclude<AccountDialog, null>) {
  current = next;
  listeners.forEach((l) => l());
}

export function closeAccountDialog() {
  current = null;
  listeners.forEach((l) => l());
}

export function useAccountDialog(): AccountDialog {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => null,
  );
}
