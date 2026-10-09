/** Ana sayfa küçük grafikleri (sunucuda çizilen saf SVG). */


/** Küçük çizgi grafik: kart içindeki eğilim göstergesi. Hepsi sıfırsa düz bir çizgi çizer. */
export function Spark({ values, tone = "forest" }: { values: number[]; tone?: "forest" | "danger" }) {
  const w = 96;
  const h = 28;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  const color = tone === "danger" ? "var(--color-danger)" : "var(--color-forest)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" className="shrink-0 overflow-visible">
      <polygon points={area} fill={color} opacity="0.12" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
