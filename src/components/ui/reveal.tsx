"use client";

import { useState, type ReactNode } from "react";
import styles from "./reveal.module.css";

/**
 * Soru açıkken yumuşakça açılan, kapalıyken etkisizleşen alan. Açılma animasyonu bitince taşan
 * içeriğin (açılır liste) kesilmemesi için taşma serbest bırakılır.
 *
 * Üstteki soruyla aynı kutuya konur ve üst dolgu (pt-9) alanın içindedir: kapalıyken araya boşluk girmez.
 */
export function Reveal({ open, children }: { open: boolean; children: ReactNode }) {
  // Sayfa zaten açık gelirse (örn. kayıtlı bilgiler) geçiş olmaz; baştan serbest bırakılır.
  const [settled, setSettled] = useState(open);
  return (
    <div
      className={styles.reveal}
      data-open={open}
      data-settled={open && settled}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && e.propertyName === "grid-template-rows") setSettled(open);
      }}
    >
      <div inert={!open}>
        <div className="pt-9">{children}</div>
      </div>
    </div>
  );
}
