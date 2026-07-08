"use client";

import { useMemo } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { StatGrid } from "@/components/dashboard/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import BarList from "@/components/dashboard/BarList";
import ReportActions from "@/components/admin/ReportActions";
import { LoadingState, ErrorState, EmptyState } from "@/components/dashboard/States";
import { useBatches } from "@/lib/hooks/useBatches";
import { toUiBatches } from "@/lib/adapters";
import { FileIcon } from "@/components/icons";

export default function AdminReports() {
  const { data, isLoading, isError, refetch } = useBatches();
  const batches = useMemo(() => (data ? toUiBatches(data) : []), [data]);

  const totalFresh = batches.reduce((s, b) => s + b.freshWeight, 0);
  const totalDried = batches.reduce((s, b) => s + (b.finalWeight ?? 0), 0);
  const moistureVals = batches.map((b) => b.moisture).filter((m): m is number => m !== undefined);
  const avgMoisture = moistureVals.length
    ? Math.round(moistureVals.reduce((s, m) => s + m, 0) / moistureVals.length)
    : 0;

  const byProduct = groupCount(batches.map((b) => b.product));
  const byHub = groupCount(batches.map((b) => b.location));

  const stats = [
    { label: "Total batches", value: String(batches.length), hint: "all hubs" },
    { label: "Fresh intake", value: `${(totalFresh / 1000).toFixed(1)}t`, hint: `${totalFresh} kg` },
    { label: "Dried output", value: `${(totalDried / 1000).toFixed(1)}t`, hint: `${totalDried} kg` },
    { label: "Avg moisture", value: `${avgMoisture}%`, hint: "final" },
  ];

  return (
    <>
      <PageHeader title="Reports" description="Throughput, yield, and traceability analytics." />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Couldn't load report data." onRetry={() => refetch()} />
      ) : batches.length === 0 ? (
        <EmptyState icon={<FileIcon className="h-6 w-6" />} title="Nothing to report yet" description="Reports populate as batches are registered." />
      ) : (
        <>
          <StatGrid stats={stats} />

          <div className="mt-6">
            <Card className="p-5">
              <p className="text-sm font-semibold text-brand-dark">Generate a report</p>
              <p className="mb-4 mt-1 text-sm text-muted">
                Export a full traceability report for regulators and buyers.
              </p>
              <ReportActions batches={batches} />
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Batches by product" />
              <div className="p-5"><BarList bars={byProduct} /></div>
            </Card>
            <Card>
              <CardHeader title="Batches by hub" />
              <div className="p-5"><BarList bars={byHub} /></div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function groupCount(values: string[]) {
  const map = values.reduce<Record<string, number>>((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(map).map(([label, value]) => ({ label, value }));
}
