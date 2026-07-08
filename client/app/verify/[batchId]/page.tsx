import PublicRecordLive from "@/components/verify/PublicRecordLive";

export default async function PublicVerifyPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  return <PublicRecordLive batchId={batchId} />;
}
