"use client";

import { useMemo } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { StatGrid } from "@/components/dashboard/StatCard";
import ChainLedger from "@/components/dashboard/ChainLedger";
import { LoadingState, ErrorState, EmptyState } from "@/components/dashboard/States";
import { useBatches } from "@/lib/hooks/useBatches";
import { buildLedger } from "@/lib/adapters";
import { LinkIcon } from "@/components/icons";

export default function AdminBlockchain() {
  const { data, isLoading, isError, refetch } = useBatches();
  const records = useMemo(() => (data ? buildLedger(data) : []), [data]);

  const confirmed = records.filter((r) => r.status === "confirmed").length;
  const pending = records.filter((r) => r.status === "pending").length;
  const failed = records.filter((r) => r.status === "failed").length;

  const stats = [
    { label: "Total records", value: String(records.length), hint: "events" },
    { label: "Confirmed", value: String(confirmed), hint: "on chain" },
    { label: "Pending", value: String(pending), hint: "awaiting" },
    { label: "Failed", value: String(failed), hint: failed ? "needs retry" : "none" },
  ];

  return (
    <>
      <PageHeader title="Blockchain ledger" description="Every batch event, recorded on the blockchain." />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Couldn't load the ledger." onRetry={() => refetch()} />
      ) : records.length === 0 ? (
        <EmptyState icon={<LinkIcon className="h-6 w-6" />} title="No on chain records yet" description="Events appear here as operators record batch updates." />
      ) : (
        <>
          <StatGrid stats={stats} />
          <div className="mt-6">
            <ChainLedger records={records} />
          </div>
        </>
      )}
    </>
  );
}
