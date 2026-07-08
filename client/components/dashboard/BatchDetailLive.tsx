"use client";

import BatchDetail from "@/components/dashboard/BatchDetail";
import PageHeader from "@/components/dashboard/PageHeader";
import { LoadingState, ErrorState } from "@/components/dashboard/States";
import { useBatch } from "@/lib/hooks/useBatches";
import { toUiBatch } from "@/lib/adapters";
import { ApiError } from "@/lib/api";

export default function BatchDetailLive({
  id,
  basePath,
  canAct = false,
}: {
  id: string;
  basePath: string;
  canAct?: boolean;
}) {
  const { data, isLoading, isError, error, refetch } = useBatch(id);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Batch" back={{ href: basePath, label: "Batches" }} />
        <LoadingState />
      </>
    );
  }

  if (isError || !data) {
    const msg = error instanceof ApiError && error.status === 404
      ? "This batch could not be found."
      : "Couldn't load this batch.";
    return (
      <>
        <PageHeader title="Batch" back={{ href: basePath, label: "Batches" }} />
        <ErrorState message={msg} onRetry={() => refetch()} />
      </>
    );
  }

  return <BatchDetail batch={toUiBatch(data)} basePath={basePath} canAct={canAct} />;
}
