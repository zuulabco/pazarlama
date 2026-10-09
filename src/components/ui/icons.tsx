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

export const SparkleIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M10 3c.4 3.7 1.9 5.6 5.6 6-3.7.4-5.2 2.3-5.6 6-.4-3.7-1.9-5.6-5.6-6C8.1 8.6 9.6 6.7 10 3Z" />
    <path d="M16 13.5c.2 1.4.8 2 2 2.2-1.2.2-1.8.8-2 2.2-.2-1.4-.8-2-2-2.2 1.2-.2 1.8-.8 2-2.2Z" />
  </Svg>
);

export const CopyIcon = ({ size }: P) => (
  <Svg size={size}>
    <rect x="7" y="7" width="9" height="9" rx="1.8" />
    <path d="M13 7V5.8A1.8 1.8 0 0 0 11.2 4H5.8A1.8 1.8 0 0 0 4 5.8v5.4A1.8 1.8 0 0 0 5.8 13H7" />
  </Svg>
);

export const ChatIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M4 10a6 6 0 0 1 11.2-3A6 6 0 0 1 9.4 16H4.5l1-2.6A5.9 5.9 0 0 1 4 10Z" />
  </Svg>
);

export const MailIcon = ({ size }: P) => (
  <Svg size={size}>
    <rect x="3.5" y="5" width="13" height="10" rx="2" />
    <path d="m4.5 6.5 5.5 4 5.5-4" />
  </Svg>
);

export const CheckIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="m4.5 10.5 3.5 3.5 7.5-8" />
  </Svg>
);

export const PenIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="m4 16 .8-3.4L13.2 4.2a1.6 1.6 0 0 1 2.3 0l.3.3a1.6 1.6 0 0 1 0 2.3L7.4 15.2 4 16Z" />
    <path d="m11.8 5.6 2.6 2.6" />
  </Svg>
);

export const PlusIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M10 4.5v11M4.5 10h11" />
  </Svg>
);

export const CalendarIcon = ({ size }: P) => (
  <Svg size={size}>
    <rect x="3.5" y="4.5" width="13" height="12" rx="2" />
    <path d="M3.5 8.5h13M7 3v3M13 3v3" />
  </Svg>
);

export const TrashIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M4.5 6h11M8 6V4.5h4V6M6 6l.6 9a1.5 1.5 0 0 0 1.5 1.4h3.8a1.5 1.5 0 0 0 1.5-1.4L14 6" />
  </Svg>
);

export const DownloadIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M10 4v8m-3-3 3 3 3-3M4.5 15.5h11" />
  </Svg>
);

export const ChevronLeftIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="m12 5-5 5 5 5" />
  </Svg>
);

export const ChevronRightIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="m8 5 5 5-5 5" />
  </Svg>
);

export const LockIcon = ({ size }: P) => (
  <Svg size={size}>
    <rect x="4.5" y="9" width="11" height="7" rx="1.6" />
    <path d="M7 9V6.8a3 3 0 0 1 6 0V9" />
  </Svg>
);

export const InboxIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M3.4 11.2 5.6 5a1.2 1.2 0 0 1 1.1-.8h6.6a1.2 1.2 0 0 1 1.1.8l2.2 6.2" />
    <path d="M3.4 11.2v4a1 1 0 0 0 1 1h11.2a1 1 0 0 0 1-1v-4h-3.4a2.2 2.2 0 0 1-4.4 0H3.4Z" />
  </Svg>
);

export const ChartIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M3.5 16.5h13" />
    <rect x="4.6" y="9.6" width="2.6" height="6.9" rx="0.6" />
    <rect x="8.7" y="5.2" width="2.6" height="11.3" rx="0.6" />
    <rect x="12.8" y="11.4" width="2.6" height="5.1" rx="0.6" />
  </Svg>
);

export const GaugeIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M3.2 14a7 7 0 1 1 13.6 0" />
    <path d="m10 11 3-4" />
    <circle cx="10" cy="11.5" r="1" />
  </Svg>
);

export const BoltIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M11 2.5 4.5 11h4.2L8 17.5 15.5 8.6h-4.3L11 2.5Z" />
  </Svg>
);

export const HomeIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M3.5 9.2 10 3.8l6.5 5.4V16a.8.8 0 0 1-.8.8H4.3a.8.8 0 0 1-.8-.8V9.2Z" />
    <path d="M8 16.8v-4.4h4v4.4" />
  </Svg>
);

export const UsersIcon = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="7.6" cy="7" r="2.8" />
    <path d="M2.8 16c.5-2.6 2.5-4 4.8-4s4.3 1.4 4.8 4" />
    <path d="M13 4.4a2.8 2.8 0 0 1 0 5.2M14.4 12.2c1.6.4 2.6 1.6 2.9 3.4" />
  </Svg>
);

export const SendIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="m3.4 9.6 13-5.6-4.6 12.4-2.6-5.2-5.8-1.6Z" />
    <path d="m9.2 11.2 3-3" />
  </Svg>
);

/** Alev: ısındırma. `filled` açıkken (ısınıyor) dolu çizilir. */
export const FlameIcon = ({ size, filled = false }: P & { filled?: boolean }) => (
  <svg viewBox="0 0 20 20" width={size ?? 18} height={size ?? 18} aria-hidden="true" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M10 2.5c.4 2.6 3.9 4.4 3.9 8.6a3.9 3.9 0 0 1-7.8 0c0-1.3.5-2.2 1.2-3 .1 1 .6 1.6 1.2 1.9C8.2 7.3 8.6 4.7 10 2.5Z" />
  </svg>
);
