import { customerTabs, SectionTabs } from "../../_components/section-tabs";
import { LeadsSkeleton } from "../../_components/skeletons";

export default function Loading() {
  return (
    <>
      <SectionTabs title="Müşteri" tabs={customerTabs} />
      <LeadsSkeleton />
    </>
  );
}
