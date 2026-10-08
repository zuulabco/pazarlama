"use client";

import { useSyncExternalStore } from "react";

const KEY = "adspine-section-collapsed";
const EVENT = "adspine-section-toggle";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function read() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Bölüm yan çubuğunun daraltılmış olup olmadığı (bu tarayıcıda hatırlanır; sunucuda hep açık). */
export const useSectionCollapsed = () => useSyncExternalStore(subscribe, read, () => false);

export function toggleSection() {
  try {
    localStorage.setItem(KEY, read() ? "0" : "1");
  } catch {
    /* depolama kapalıysa tercih kaydedilmez */
  }
  window.dispatchEvent(new Event(EVENT));
}
