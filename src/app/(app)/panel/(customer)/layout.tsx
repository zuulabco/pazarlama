import { FindBar } from "../../_components/section-tabs";
import { FindModeSwitch } from "../../_components/find-mode-switch";

/** Yerel işletmeler modu (Ara, Kaydedilenler): ortak "Potansiyel müşterilerimi bul" çubuğu ve mod seçici sayfa geçişlerinde sabit kalır. */
export default function CustomerLayout({ children }: LayoutProps<"/panel">) {
  return (
    <>
      <FindBar />
      <FindModeSwitch />
      {children}
    </>
  );
}
