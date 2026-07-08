import BatchDetailLive from "@/components/dashboard/BatchDetailLive";

export default async function AdminBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BatchDetailLive id={id} basePath="/admin/batches" />;
}
