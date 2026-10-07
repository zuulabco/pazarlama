import type { ReactNode } from "react";

/** Tek biçimli, çizgi stilinde vektör simgeler (currentColor). Boyut `size` ile verilir. */
function Svg({ size = 18, children }: { size?: number; children: ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {children}
    </svg>
  );
}

type P = { size?: number };

export const PhoneIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M6.4 3.5h2l1 3.2-1.5 1a9.8 9.8 0 0 0 3.4 3.4l1-1.5 3.2 1v2a1.8 1.8 0 0 1-1.9 1.8A11.6 11.6 0 0 1 4.6 5.4 1.8 1.8 0 0 1 6.4 3.5Z" />
  </Svg>
);

export const GlobeIcon = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="10" cy="10" r="7" />
    <path d="M3.3 10h13.4M10 3c2 2 3 4.3 3 7s-1 5-3 7c-2-2-3-4.3-3-7s1-5 3-7Z" />
  </Svg>
);

export const MapPinIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M10 17s5.5-4.6 5.5-9a5.5 5.5 0 1 0-11 0c0 4.4 5.5 9 5.5 9Z" />
    <circle cx="10" cy="8" r="2" />
  </Svg>
);

export const BookmarkIcon = ({ size, filled = false }: P & { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" width={size ?? 19} height={size ?? 19} aria-hidden="true" className="shrink-0">
    <path d="M7.5 4h9a1 1 0 0 1 1 1v14.5l-5.5-3.7-5.5 3.7V5a1 1 0 0 1 1-1Z" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);

export const NoteIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6.2a1.5 1.5 0 0 1-.4 1L12.7 15.6a1.5 1.5 0 0 1-1 .4H5.5A1.5 1.5 0 0 1 4 14.5v-9Z" />
    <path d="M7 8h6M7 11h3" />
  </Svg>
);

export const ArrowRightIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M4 10h12M11.5 5.5 16 10l-4.5 4.5" />
  </Svg>
);

export const ArrowLeftIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M16 10H4M8.5 5.5 4 10l4.5 4.5" />
  </Svg>
);

export const SearchIcon = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="9" cy="9" r="5" />
    <path d="m13 13 3.5 3.5" />
  </Svg>
);
