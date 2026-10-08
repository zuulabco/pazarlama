import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Eski adres: "Kampanyalar" bölümü "Otomasyon" oldu.
  async redirects() {
    return [
      { source: "/panel/kampanyalar", destination: "/panel/otomasyon", permanent: true },
      { source: "/panel/kampanyalar/:id", destination: "/panel/otomasyon/:id", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        // CSS Modules hariç: aksi halde global CSS'e dönüşüp class adları hash'lenmiyor.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
