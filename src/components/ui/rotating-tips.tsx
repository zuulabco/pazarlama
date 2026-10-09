"use client";

import { useEffect, useState } from "react";
import styles from "./rotating-tips.module.css";

/** Müşteri aramasında dönen ipuçları. */
export const searchTips = [
  "Aynı şirketten tek kişi seçmek, hem çeşitlilik hem de spam riski açısından daha güvenlidir.",
  "Dar bir unvan ve sektör seçimi, daha ilgili ve daha yanıt veren bir liste çıkarır.",
  "İlk e-postada hizmetinizi değil, alıcının işine bağlanan tek bir fayda cümlesini yazmak daha çok ilgi çeker.",
  "Listelemek Spine Kredi harcamaz; yalnızca gizli bilgilerini açıp eklediğiniz kişiler harcar.",
  "Kaydettiğiniz aramalar, filtrelerinizi tek tıkla geri getirir.",
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
