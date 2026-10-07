import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = site.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const rows = [
  { name: "Lale Diş Kliniği", score: 92, mark: true },
  { name: "Feneryolu Dental", score: 87, mark: true },
  { name: "Bahariye Ağız ve Diş", score: 74, mark: false },
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
          background: "#f4f6f3",
          color: "#15201c",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 560 }}>
          <div style={{ fontSize: 34, color: "#1d4a3c" }}>Sinyal</div>
          <div style={{ fontSize: 64, lineHeight: 1.05, letterSpacing: -2, marginTop: 28 }}>
            Hizmetinize en çok ihtiyacı olan firmaları bulun.
          </div>
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
            border: "1px solid #d9dfda",
          }}
        >
          {rows.map((r) => (
            <div
              key={r.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "20px 20px",
                borderRadius: 14,
                background: r.mark ? "#e3f27a" : "transparent",
                fontSize: 28,
              }}
            >
              <span>{r.name}</span>
              <span style={{ fontSize: 36 }}>{r.score}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
