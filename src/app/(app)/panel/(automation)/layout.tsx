import { Suspense } from "react";
import { automationTabs, SectionTabs } from "../../_components/section-tabs";

/** Otomasyon bölümü (Kişiler, Kampanyalar, Posta kutuları…): başlık ve sekmeler sayfa geçişlerinde sabit kalır. */
export default function AutomationLayout({ children }: LayoutProps<"/panel">) {
  return (
    <>
      {/* Dinamik yollarda (kampanya ayrıntısı) geçerli yol istekte bilinir; sekmeler Suspense içinde kalmalı. */}
      <Suspense fallback={<div className="mb-8 h-[6.5rem]" />}>
        <SectionTabs title="Otomasyon" tabs={automationTabs} />
      </Suspense>
      {children}
    </>
  );
}
