import { customerTabs, SectionTabs } from "../../_components/section-tabs";
import { BoardSkeleton } from "../../_components/skeletons";

export default function Loading() {
  return (
    <>
      <SectionTabs title="Müşteri" tabs={customerTabs} />
      <BoardSkeleton />
    </>
  );
}
