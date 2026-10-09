import { Suspense } from "react";
import { FindModeSwitch } from "../../_components/find-mode-switch";
import { AutomationBar } from "../../_components/section-tabs";

/** Otomasyon sayfaları (Kişi bul, Kişiler, Otomasyonlar, Gönderici adresleri): üst çubuk sayfa geçişlerinde sabit kalır. */
export default function AutomationLayout({ children }: LayoutProps<"/panel">) {
  return (
    <>
      {/* Geçerli yol istekte bilinir (dinamik yollar); çubuk Suspense içinde kalmalı. */}
      <Suspense fallback={<div className="-mx-4 mb-5 h-12 border-b border-line sm:-mx-6" />}>
        <AutomationBar />
      </Suspense>
      <FindModeSwitch />
      {children}
    </>
  );
}
