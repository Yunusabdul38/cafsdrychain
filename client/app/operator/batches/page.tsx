import PageHeader from "@/components/dashboard/PageHeader";
import BatchBrowser from "@/components/dashboard/BatchBrowser";
import { LinkButton } from "@/components/ui/Button";
import { batches } from "@/lib/mock-data";
import { PlusIcon } from "@/components/icons";

export default function OperatorBatches() {
  return (
    <>
      <PageHeader
        title="Batches"
        description="Every batch registered at your hub."
        action={
          <LinkButton href="/operator/register">
            <PlusIcon className="h-5 w-5" /> Register
          </LinkButton>
        }
      />
      <BatchBrowser batches={batches} basePath="/operator/batches" />
    </>
  );
}
