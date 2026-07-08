"use client";

import AdvanceForm from "@/components/operator/AdvanceForm";
import PageHeader from "@/components/dashboard/PageHeader";
import { LoadingState, ErrorState } from "@/components/dashboard/States";
import { useBatch } from "@/lib/hooks/useBatches";
import { toUiBatch } from "@/lib/adapters";

export default function AdvanceFormLive({ id }: { id: string }) {
  const { data, isLoading, isError, refetch } = useBatch(id);
  const basePath = "/operator/batches";

  if (isLoading) {
    return (
      <>
        <PageHeader title="Update batch" back={{ href: basePath, label: "Batches" }} />
        <LoadingState />
      </>
    );
  }
  if (isError || !data) {
    return (
      <>
        <PageHeader title="Update batch" back={{ href: basePath, label: "Batches" }} />
        <ErrorState message="Couldn't load this batch." onRetry={() => refetch()} />
      </>
    );
  }
  return <AdvanceForm batch={toUiBatch(data)} basePath={basePath} />;
}
