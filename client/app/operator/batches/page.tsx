"use client";

import { useMemo } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import BatchBrowser from "@/components/dashboard/BatchBrowser";
import { LinkButton } from "@/components/ui/Button";
import { LoadingState, ErrorState, EmptyState } from "@/components/dashboard/States";
import { useBatches } from "@/lib/hooks/useBatches";
import { toUiBatches } from "@/lib/adapters";
import { PlusIcon, ListIcon } from "@/components/icons";

export default function OperatorBatches() {
  const { data, isLoading, isError, refetch } = useBatches();
  const batches = useMemo(() => (data ? toUiBatches(data) : []), [data]);

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
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Couldn't load batches." onRetry={() => refetch()} />
      ) : batches.length === 0 ? (
        <EmptyState
          icon={<ListIcon className="h-6 w-6" />}
          title="No batches yet"
          description="Register produce to create your first batch."
          action={<LinkButton href="/operator/register">Register a batch</LinkButton>}
        />
      ) : (
        <BatchBrowser batches={batches} basePath="/operator/batches" />
      )}
    </>
  );
}
