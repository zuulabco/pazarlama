import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iPhone/iPad ana ekran simgesi: marka mavisi üzerinde beyaz çam ağacı (favicon ile aynı işaret). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0072e5" }}>
        <svg viewBox="0 0 32 32" width="120" height="120">
          <path d="M16 5 9.5 14h3.5L8 21h16l-5-7h3.5z" fill="#ffffff" strokeLinejoin="round" />
          <rect x="14.6" y="21" width="2.8" height="5" rx=".7" fill="#ffffff" />
        </svg>
      </div>
    ),
    size,
  );
}
