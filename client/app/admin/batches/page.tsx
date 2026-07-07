import PageHeader from "@/components/dashboard/PageHeader";
import BatchBrowser from "@/components/dashboard/BatchBrowser";
import { batches } from "@/lib/mock-data";

export default function AdminBatches() {
  return (
    <>
      <PageHeader
        title="All batches"
        description="Every batch across all hubs, in real time."
      />
      <BatchBrowser batches={batches} basePath="/admin/batches" showOperator />
    </>
  );
}
