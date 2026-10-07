import type { ReactNode } from "react";
import styles from "./skeleton.module.css";

/** Tek bir iskelet parçası. Boyut ve şekil `className` ile verilir (örn. "h-4 w-40"). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`${styles.skeleton} rounded-control ${className}`} />;
}

/**
 * İskelet bölgesi: ekran okuyucuya "yükleniyor" bildirir, görsel parçalar gizlidir.
 * Sayfa geçişlerinde (loading.tsx) ve sayfa içi bekleme alanlarında kullanılır.
 */
export function SkeletonRegion({ children, label = "Sayfa yükleniyor" }: { children: ReactNode; label?: string }) {
  return (
    <div role="status" aria-busy="true" data-skeleton="" className="grid gap-5">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
