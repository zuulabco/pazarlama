import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";

/**
 * Sayfa geçişlerinde, hedef sayfanın şeklini taklit eden iskeletler. Her biri güncel arayüzün düzenini izler:
 * kart/panel yüzeyleri (rounded-panel + ring), tablo satırları, iki bölmeli ekranlar.
 */

const panel = "rounded-panel bg-surface ring-1 ring-line";

/** Müşteri bul: solda gruplu filtreler ve sabit düğme, sağda yuvarlak Adspine AI kutusu ile başlangıç ekranı. */
export function LeadsSkeleton() {
  return (
    <SkeletonRegion>
      <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="grid gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-row bg-surface p-4 ring-1 ring-line">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="size-5 rounded-full" />
              </div>
              {i < 2 && (
                <div className="mt-4 grid gap-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-12 w-full rounded-row" />
                </div>
              )}
            </div>
          ))}
          <Skeleton className="mt-1 h-12 w-full rounded-control" />
        </div>
        <div className={`${panel} grid min-h-[28rem] content-start gap-6 p-5 sm:p-6`}>
          <div className="mx-auto grid w-full max-w-3xl gap-6 pt-6 sm:pt-14">
            <Skeleton className="mx-auto h-8 w-72 max-w-full" />
            <Skeleton className="h-[3.75rem] w-full rounded-full" />
            <div className="flex flex-wrap justify-center gap-2">
              {[28, 36, 32, 40, 30].map((w, i) => (
                <Skeleton key={i} className="h-9 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}

/** Kayıtlı kişiler tablosunun yükleniyor hâli: avatarlı satırlar ve sütunlar (sayfa yüklenirken ve filtre değişirken aynı iskelet). */
export function ContactRowsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" className="overflow-hidden rounded-row ring-1 ring-line">
      <span className="sr-only">Kişiler yükleniyor</span>
      <div className="hidden grid-cols-[2.5rem_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1fr)_6rem] items-center gap-3 bg-sunken/60 px-3 py-3 md:grid">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className={i === 0 ? "size-4" : "h-3 w-16"} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-3 md:grid-cols-[2.5rem_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1fr)_6rem]">
          <Skeleton className="size-4" />
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="hidden h-4 w-3/4 md:block" />
          <div className="hidden gap-1.5 md:grid">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="hidden h-4 w-2/3 md:block" />
          <Skeleton className="hidden h-4 w-3/4 md:block" />
          <Skeleton className="h-8 w-20 justify-self-end rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Kayıtlı kişiler sayfası: sekmeler ve işlem düğmeleri, araç çubuğu, özet satırı ve tablo. */
export function ContactsSkeleton() {
  return (
    <SkeletonRegion>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-10 w-72 max-w-full rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <div className={`${panel} grid gap-4 p-4 sm:p-5`}>
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-8 w-64" />
        </div>
        <ContactRowsSkeleton />
      </div>
    </SkeletonRegion>
  );
}

/** Arama kutusu, filtre seçenekleri ve satır listesi (Otomasyonlar, Gönderici adresleri). */
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
