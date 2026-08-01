"use client";

import { useMemo } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import BatchBrowser from "@/components/dashboard/BatchBrowser";
import { LoadingState, ErrorState, EmptyState } from "@/components/dashboard/States";
import { useBatches } from "@/lib/hooks/useBatches";
import { toUiBatches } from "@/lib/adapters";
import { ListIcon } from "@/components/icons";
import { LiveIndicator } from "@/components/ui/LiveIndicator";

export default function AdminBatches() {
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useBatches();
  const batches = useMemo(() => (data ? toUiBatches(data) : []), [data]);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="All batches" description="Every batch across all hubs, in real time." />
        <LiveIndicator dataUpdatedAt={dataUpdatedAt} className="mt-1 shrink-0" />
      </div>
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Couldn't load batches." onRetry={() => refetch()} />
      ) : batches.length === 0 ? (
        <EmptyState
          icon={<ListIcon className="h-6 w-6" />}
          title="No batches yet"
          description="Batches registered by operators will appear here."
        />
      ) : (
        <BatchBrowser batches={batches} basePath="/admin/batches" showOperator showLocation />
      )}
    </>
  );
}
