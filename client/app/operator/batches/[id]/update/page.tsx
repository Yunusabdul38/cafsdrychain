import { notFound } from "next/navigation";
import AdvanceForm from "@/components/operator/AdvanceForm";
import { getBatch } from "@/lib/mock-data";

export default async function UpdateBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch = getBatch(id);
  if (!batch) notFound();
  return <AdvanceForm batch={batch} basePath="/operator/batches" />;
}
