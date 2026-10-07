"use client";

import { useEffect, useState } from "react";
import styles from "./rotating-tips.module.css";

/** Yükleme sırasında dönen kısa ipuçları. Sırası sabittir (sunucu ve istemci aynı ilk ipucunu çizer). */
const tips = [
  "Web sitesi olmayan firmalar, web tasarım teklifleri için en sıcak adaylardır.",
  "Çok yorumu olup dijitalde zayıf kalan firmalar, genellikle hızlı karar verir.",
  "İlk mesajda hizmetinizi değil, firmanın kaçırdığı fırsatı anlatmak daha çok ilgi çeker.",
  "Telefonu olan firmalara önce WhatsApp'tan yazmak, aramaktan daha az rahatsız edicidir.",
  "Yıldızla işaretlediğiniz firmalar, Firmalar sayfasında takip listenizde toplanır.",
  "Skorlar profilinize göre hesaplanır; profilinizi güncellerseniz sonraki aramalar değişir.",
  "Az firma istemek sonucu hızlandırır; ilk bakış için 10–25 firma yeterlidir.",
];

const INTERVAL_MS = 3800;

export function RotatingTips() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % tips.length), INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="grid max-w-[28rem] justify-items-center gap-1.5 text-center" aria-live="off">
      <p className="text-xs font-medium tracking-wide text-forest">İpucu</p>
      {/* key değişince animasyon yeniden başlar */}
      <p key={index} className={`${styles.tip} min-h-12 text-balance text-muted`}>
        {tips[index]}
      </p>
    </div>
  );
}
