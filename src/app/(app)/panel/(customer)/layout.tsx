import { customerTabs, SectionTabs } from "../../_components/section-tabs";

/** Müşteri bölümü (Müşteri bul, Takip et, İletişim kur): başlık ve sekmeler sayfa geçişlerinde sabit kalır. */
export default function CustomerLayout({ children }: LayoutProps<"/panel">) {
  return (
    <>
      <SectionTabs title="Yerel firmalar" tabs={customerTabs} />
      {children}
    </>
  );
}
