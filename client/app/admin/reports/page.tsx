"use client";

import { titleCase } from "@/lib/utils";
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

  // Only batches that finished drying have a final weight, so this covers a
  // smaller set than fresh intake. The hints say so, because comparing the two
  // totals directly would read as a yield figure and be wrong.
  const dried = batches.filter((b) => b.finalWeight !== undefined);
  const totalDried = dried.reduce((s, b) => s + (b.finalWeight ?? 0), 0);

  const moistureVals = batches.map((b) => b.moisture).filter((m): m is number => m !== undefined);
  // Kept to one decimal: readings like 0.4% rounded to a whole number showed 0%.
  const avgMoisture = moistureVals.length
    ? moistureVals.reduce((s, m) => s + m, 0) / moistureVals.length
    : 0;

  const plural = (n: number, word: string) =>
    `${n} ${n === 1 ? word : word === "batch" ? "batches" : word + "s"}`;

  const byProduct = groupCount(batches.map((b) => titleCase(b.product)));
  const byHub = groupCount(batches.map((b) => titleCase(b.location)));

  const stats = [
    {
      label: "Batches registered",
      value: String(batches.length),
      hint: "across all hubs",
    },
    {
      label: "Fresh weight in",
      value: `${totalFresh.toLocaleString()} kg`,
      hint: `from ${plural(batches.length, "batch")}`,
    },
    {
      label: "Dried weight out",
      value: `${totalDried.toLocaleString()} kg`,
      hint: `from ${dried.length} finished`,
    },
    {
      label: "Average moisture",
      value: `${avgMoisture.toFixed(1)}%`,
      hint: moistureVals.length
        ? `${plural(moistureVals.length, "reading")} recorded`
        : "none recorded yet",
    },
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

          {/* Export panel — reads as a deliberate deliverable, not a stray button */}
          <Card className="mt-6 overflow-hidden print:hidden">
            <div className="flex flex-col gap-5 bg-mint/30 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-brand">
                  <FileIcon className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-brand-dark">Traceability report</p>
                  <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted">
                    Every batch with its category, weights, drying record and
                    blockchain status, laid out for regulators and buyers.
                  </p>
                  <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    <span className="font-medium text-brand-dark">
                      {plural(batches.length, "batch")}
                    </span>
                    <span className="text-black/20">·</span>
                    <span>{plural(byHub.length, "hub")}</span>
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <ReportActions batches={batches} />
              </div>
            </div>
          </Card>

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
