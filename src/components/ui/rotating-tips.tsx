"use client";

import { useEffect, useState } from "react";
import styles from "./rotating-tips.module.css";

/** Müşteri aramasında dönen ipuçları. */
export const searchTips = [
  "Web sitesi olmayan firmalar, web tasarım teklifleri için en sıcak adaylardır.",
  "Çok yorumu olup dijitalde zayıf kalan firmalar, genellikle hızlı karar verir.",
  "İlk mesajda hizmetinizi değil, firmanın kaçırdığı fırsatı anlatmak daha çok ilgi çeker.",
  "Telefonu olan firmalara önce WhatsApp'tan yazmak, aramaktan daha az rahatsız edicidir.",
  "Yıldızla işaretlediğiniz firmalar, Firmalar sayfasında takip listenizde toplanır.",
  "Skorlar profilinize göre hesaplanır; profilinizi güncellerseniz sonraki aramalar değişir.",
  "Az firma istemek sonucu hızlandırır; ilk bakış için 10–25 firma yeterlidir.",
];

const INTERVAL_MS = 3800;

/** Yükleme sırasında dönen kısa metinler. Sırası sabittir (sunucu ve istemci aynı ilkini çizer). */
export function RotatingTips({ tips, label = "İpucu" }: { tips: readonly string[]; label?: string | null }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % tips.length), INTERVAL_MS);
    return () => clearInterval(timer);
  }, [tips.length]);

  return (
    <div className="grid max-w-[28rem] justify-items-center gap-1.5 text-center" aria-live="off">
      {label && <p className="text-xs font-medium tracking-wide text-accent">{label}</p>}
      {/* key değişince animasyon yeniden başlar */}
      <p key={index} className={`${styles.tip} min-h-12 text-balance text-muted`}>
        {tips[index]}
      </p>
    </div>
  );
}
