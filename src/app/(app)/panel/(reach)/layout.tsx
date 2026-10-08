import { SectionTabs } from "../../_components/section-tabs";

/** Ulaş bölümündeki, kendi başlığı olan araçlar (Mesaj hazırla). */
export default function ReachLayout({ children }: LayoutProps<"/panel">) {
  return (
    <>
      <SectionTabs title="Mesaj hazırla" />
      {children}
    </>
  );
}
