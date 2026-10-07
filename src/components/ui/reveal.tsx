"use client";

import type { ReactNode } from "react";
import { Collapse } from "./collapse";

/**
 * Koşullu soru: üstündeki soruyla aynı kutuya konur ve üst dolgu (pt-9) alanın içindedir; bu yüzden
 * kapalıyken araya boşluk girmez.
 */
export function Reveal({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <Collapse open={open}>
      <div className="pt-9">{children}</div>
    </Collapse>
  );
}
