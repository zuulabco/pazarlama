import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";

/** Sayfa geçişlerinde, hedef sayfanın şeklini taklit eden iskeletler. */

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

/** Müşteri bul: solda filtre kutusu, sağda sonuç kartı. */
export function LeadsSkeleton() {
  return (
    <SkeletonRegion>
      <div className="grid items-start gap-5 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-x-6">
        <div className="grid gap-5 rounded-panel bg-surface p-5 ring-1 ring-line">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-12 w-full rounded-control" />
        </div>
        <div className="hidden rounded-panel bg-surface ring-1 ring-line lg:block">
          <div className="grid gap-3 border-b border-line px-5 py-5">
            <Skeleton className="h-7 w-56" />
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

/** Takip: arama kutusu ve üç sütunlu pano. */
export function BoardSkeleton() {
  return (
    <SkeletonRegion>
      <Skeleton className="h-11 w-full rounded-full sm:w-80" />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, c) => (
          <div key={c} className="grid gap-3 rounded-panel bg-sunken/50 p-3 ring-1 ring-line">
            <Skeleton className="m-2 h-5 w-32 bg-line/50" />
            {Array.from({ length: c === 0 ? 2 : 1 }, (_, i) => (
              <div key={i} className="grid gap-3 rounded-row bg-surface p-4 ring-1 ring-line">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3.5 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="size-9 rounded-full" />
                  <Skeleton className="size-9 rounded-full" />
                  <Skeleton className="size-9 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

/** Panel ana sayfası: karşılama satırı ve iki özellik kartı. */
export function DashboardSkeleton() {
  return (
    <SkeletonRegion>
      <div className="grid gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-panel bg-surface ring-1 ring-line">
            <Skeleton className="h-64 rounded-none" />
            <div className="grid gap-3 p-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

/** Karşılama ve diğer tek sütunlu sayfalar. */
export function PageSkeleton() {
  return (
    <SkeletonRegion>
      <div className="grid gap-4">
        <Skeleton className="h-10 w-2/3 max-w-xl" />
        <Skeleton className="h-4 w-full max-w-prose" />
        <Skeleton className="h-4 w-1/2 max-w-prose" />
        <div className="mt-4 flex gap-3">
          <Skeleton className="h-12 w-36" />
          <Skeleton className="h-12 w-28" />
        </div>
      </div>
      <Skeleton className="mt-6 h-72 w-full rounded-panel" />
    </SkeletonRegion>
  );
}
