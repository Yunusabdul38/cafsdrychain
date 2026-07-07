import Link from "next/link";
import { getBatch } from "@/lib/mock-data";
import PublicRecord from "@/components/verify/PublicRecord";
import { Card } from "@/components/ui/Card";
import { CloseIcon } from "@/components/icons";

export default async function PublicVerifyPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const batch = getBatch(batchId);

  if (!batch) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
          <CloseIcon className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-brand-dark">
          Batch not found
        </h1>
        <p className="mt-2 text-sm text-muted">
          We couldn&apos;t find a record for{" "}
          <span className="font-mono">{batchId}</span>. Check the Batch ID and
          try again.
        </p>
        <Link
          href="/verify"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-brand-dark px-6 text-sm font-semibold text-white hover:bg-brand-darker"
        >
          Back to verify
        </Link>
      </Card>
    );
  }

  return <PublicRecord batch={batch} />;
}
