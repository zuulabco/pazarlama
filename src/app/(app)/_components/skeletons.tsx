import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";

/**
 * Sayfa geçişlerinde, hedef sayfanın şeklini taklit eden iskeletler. Her biri güncel arayüzün düzenini izler:
 * kart/panel yüzeyleri (rounded-panel + ring), tablo satırları, iki bölmeli ekranlar.
 */

const panel = "rounded-panel bg-surface ring-1 ring-line";

function Row() {
  return (
    <div className="flex items-center gap-4 border-b border-line px-5 py-5 last:border-b-0">
      <div className="grid flex-1 gap-2.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
      <Skeleton className="hidden h-2 w-28 sm:block" />
      <Skeleton className="h-8 w-10" />
    </div>
  );
}

/** Sol filtre çubuğu + sağda sonuç listesi (Müşteri bul). */
export function LeadsSkeleton() {
  return (
    <SkeletonRegion>
      <div className="grid items-start gap-5 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-x-6">
        <div className={`${panel} grid gap-5 p-5`}>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full rounded-control" />
        </div>
        <div className={`${panel} hidden lg:block`}>
          <div className="grid gap-3 border-b border-line px-5 py-5">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          {Array.from({ length: 5 }, (_, i) => (
            <Row key={i} />
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}

/** Arama kutusu, filtre seçenekleri ve satır listesi (Kayıtlı kişiler, Otomasyonlar, Gönderici adresleri). */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <SkeletonRegion>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-10 w-full sm:w-80" />
        <Skeleton className="h-10 w-64 max-w-full" />
      </div>
      <div className={`${panel} p-3 sm:p-4`}>
        <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_6rem_minmax(0,1fr)] gap-3 border-b border-line px-2 pb-3 md:grid">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line px-2 py-3.5 last:border-b-0">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="hidden h-4 w-40 md:block" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

/** Gelen kutusu: konuşma listesi ve konuşma bölmesi. */
export function InboxSkeleton() {
  return (
    <SkeletonRegion>
      <div className="grid h-[calc(100svh-6.5rem)] min-h-[28rem] gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className={`${panel} grid content-start gap-3 p-3`}>
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-24" />
          </div>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-start gap-3 px-1 py-2">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className={`${panel} hidden place-items-center lg:grid`}>
          <div className="grid justify-items-center gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-56" />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}

/** Raporlar: sekmeler, tarih aralığı, özet kartları ve grafik. */
export function ReportsSkeleton() {
  return (
    <SkeletonRegion>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-10 w-60 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={`${panel} grid gap-2 p-4`}>
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className={`${panel} p-5`}>
        <Skeleton className="mb-4 h-5 w-36" />
        <Skeleton className="h-44 w-full rounded-control" />
      </div>
    </SkeletonRegion>
  );
}

/** Takvim: ay tablosu ve gün paneli. */
export function CalendarSkeleton() {
  return (
    <SkeletonRegion>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className={`${panel} grid gap-4 p-5`}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-9 w-48" />
          </div>
          <Skeleton className="h-[26rem] w-full rounded-control" />
        </div>
        <div className={`${panel} hidden gap-4 p-5 lg:grid`}>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </SkeletonRegion>
  );
}

/** Mesaj hazırla: sol ayar paneli, sağ sonuç paneli. */
export function ComposerSkeleton() {
  return (
    <SkeletonRegion>
      <div className="grid gap-1.5">
        <Skeleton className="h-6 w-80 max-w-full" />
        <Skeleton className="h-4 w-full max-w-[44rem]" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className={`${panel} grid gap-5 p-5 sm:p-6`}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="grid gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
          <Skeleton className="h-12 w-full" />
        </div>
        <div className={`${panel} hidden min-h-[22rem] place-items-center lg:grid`}>
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
      </div>
    </SkeletonRegion>
  );
}

/** Ana sayfa: karşılama, soru çubuğu, dört gösterge kartı, grafik ve iki sütunlu etkinlik. */
export function DashboardSkeleton() {
  return (
    <SkeletonRegion>
      <div className="grid w-full gap-6">
        <div className="flex items-end justify-between gap-4">
          <div className="grid gap-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="hidden h-10 w-56 sm:block" />
        </div>
        <Skeleton className="h-14 w-full rounded-panel" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={`${panel} grid gap-2 p-5`}>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-panel" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-panel" />
          <Skeleton className="h-56 w-full rounded-panel" />
        </div>
      </div>
    </SkeletonRegion>
  );
}

/** Profil ve diğer tek sütunlu sayfalar. */
export function PageSkeleton() {
  return (
    <SkeletonRegion>
      <div className="grid gap-4">
        <Skeleton className="h-9 w-2/3 max-w-xl" />
        <Skeleton className="h-4 w-full max-w-prose" />
        <Skeleton className="h-4 w-1/2 max-w-prose" />
      </div>
      <div className={`${panel} grid gap-4 p-6`}>
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-2/3" />
      </div>
    </SkeletonRegion>
  );
}
