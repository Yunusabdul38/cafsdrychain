import PageHeader from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/Card";
import VerifyLookup from "@/components/verify/VerifyLookup";
import BatchBrowser from "@/components/dashboard/BatchBrowser";
import { batches } from "@/lib/mock-data";

export default function AuditorVerify() {
  return (
    <>
      <PageHeader
        title="Verify"
        description="Look up any batch and inspect its on-chain history."
      />

      <Card className="p-5 sm:p-6">
        <VerifyLookup basePath="/auditor/batches" />
      </Card>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted">
        All batches
      </h2>
      <BatchBrowser batches={batches} basePath="/auditor/batches" showOperator />
    </>
  );
}
