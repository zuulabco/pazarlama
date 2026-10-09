import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = site.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Paylaşım görseli: marka mavisi, "Müşteri bul" sonuç listesinden bir kesit (kişi, unvan, uyum skoru). */
const rows = [
  { name: "Elif Yıldız", title: "Pazarlama Müdürü", score: 92, mark: true },
  { name: "Mert Aydın", title: "Kurucu", score: 87, mark: true },
  { name: "Selin Kaya", title: "Genel Müdür", score: 74, mark: false },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #0b7cf0 0%, #0a3f9e 100%)",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 560 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 36, fontWeight: 600 }}>
            <svg viewBox="0 0 32 32" width="44" height="44">
              <path d="M16 5 9.5 14h3.5L8 21h16l-5-7h3.5z" fill="#ffffff" />
              <rect x="14.6" y="21" width="2.8" height="5" rx=".7" fill="#ffffff" />
            </svg>
            Adspine
          </div>
          <div style={{ fontSize: 64, lineHeight: 1.05, letterSpacing: -2, marginTop: 28 }}>Doğru kişiyi bulun, kendi adresinizden ulaşın.</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            width: 440,
            padding: 16,
            background: "#ffffff",
            borderRadius: 24,
            color: "#16181c",
          }}
        >
          {rows.map((r) => (
            <div
              key={r.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "18px 20px",
                borderRadius: 14,
                background: r.mark ? "#e3effd" : "transparent",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 28, fontWeight: 600 }}>{r.name}</span>
                <span style={{ fontSize: 20, color: "#5b616b" }}>{r.title}</span>
              </div>
              <span style={{ fontSize: 36, fontWeight: 600, color: "#005cc0" }}>{r.score}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
