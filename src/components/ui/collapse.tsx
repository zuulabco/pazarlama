"use client";

import { useState, type ReactNode } from "react";
import styles from "./collapse.module.css";

/**
 * Yumuşakça açılıp kapanan alan. Site genelinde tüm akordiyon benzeri yapılar bunu kullanır
 * (bkz. DESIGN.md): anında "tak" diye açılan hiçbir alan olmamalı.
 *
 * Kapalıyken içerik etkisizdir (`inert`): klavyeyle odaklanılamaz, ekran okuyucuya görünmez.
 */
export function Collapse({ open, children, className = "" }: { open: boolean; children: ReactNode; className?: string }) {
  // Sayfa zaten açık gelirse geçiş olmaz; taşma baştan serbest bırakılır.
  const [settled, setSettled] = useState(open);
  return (
    <div
      className={`${styles.collapse} ${className}`}
      data-open={open}
      data-settled={open && settled}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && e.propertyName === "grid-template-rows") setSettled(open);
      }}
    >
      <div className={styles.inner} inert={!open}>
        {children}
      </div>
    </div>
  );
}
