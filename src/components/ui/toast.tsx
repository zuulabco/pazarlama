"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import styles from "./toast.module.css";

/**
 * Bildirim (toast): bir işlemin sonucunu kullanıcıya hemen bildirir (bkz. DESIGN.md).
 * Her yerden `toast("Firma takibe alındı")` ile çağrılır; `<Toaster />` bileşeni ekranda bir kez çizilir.
 */
type Action = { label: string; href?: string; onClick?: () => void };
type Item = { id: number; message: string; kind: "success" | "error"; action?: Action; leaving: boolean };

let items: Item[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const EMPTY: Item[] = [];

const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function dismiss(id: number) {
  items = items.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, 320);
}

export function toast(message: string, opts: { kind?: "success" | "error"; action?: Action; duration?: number } = {}) {
  const id = ++seq;
  items = [...items.slice(-2), { id, message, kind: opts.kind ?? "success", action: opts.action, leaving: false }];
  emit();
  setTimeout(() => dismiss(id), opts.duration ?? (opts.kind === "error" ? 6000 : 4500));
}

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => EMPTY);
  return (
    <div className={styles.region} role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={styles.toast} data-kind={t.kind} data-leaving={t.leaving}>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className={styles.icon}>
            {t.kind === "success" ? (
              <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M8 4v5m0 3v.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            )}
          </svg>
          <span>{t.message}</span>
          {t.action &&
            (t.action.href ? (
              <Link href={t.action.href} className={styles.action} onClick={() => dismiss(t.id)}>
                {t.action.label}
              </Link>
            ) : (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  t.action?.onClick?.();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            ))}
          <button type="button" className={styles.close} onClick={() => dismiss(t.id)} aria-label="Bildirimi kapat">
            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
              <path d="m2.5 2.5 7 7m0-7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
