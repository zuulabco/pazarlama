import { customerTabs, SectionTabs } from "../../_components/section-tabs";
import { PageSkeleton } from "../../_components/skeletons";

export default function Loading() {
  return (
    <>
      <SectionTabs title="Müşteri" tabs={customerTabs} />
      <PageSkeleton />
    </>
  );
}
