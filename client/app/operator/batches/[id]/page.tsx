import { notFound } from "next/navigation";
import BatchDetail from "@/components/dashboard/BatchDetail";
import { getBatch } from "@/lib/mock-data";

export default async function OperatorBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch = getBatch(id);
  if (!batch) notFound();
  return (
    <BatchDetail batch={batch} basePath="/operator/batches" canAct />
  );
}
