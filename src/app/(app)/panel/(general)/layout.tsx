import { SectionTabs } from "../../_components/section-tabs";

/** Genel araçlar (Takvim): belirli bir bölüme bağlı olmayan, her yerden kullanılan sayfalar. */
export default function GeneralLayout({ children }: LayoutProps<"/panel">) {
  return (
    <>
      <SectionTabs title="Takvim" />
      {children}
    </>
  );
}
