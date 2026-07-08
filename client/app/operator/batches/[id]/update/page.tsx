import AdvanceFormLive from "@/components/operator/AdvanceFormLive";

export default async function UpdateBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdvanceFormLive id={id} />;
}
