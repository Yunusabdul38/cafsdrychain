"use client";

import { titleCase } from "@/lib/utils";
import Link from "next/link";
import { useMemo } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { StatGrid } from "@/components/dashboard/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import BarList from "@/components/dashboard/BarList";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/dashboard/States";
import { useBatches } from "@/lib/hooks/useBatches";
import { useUsers } from "@/lib/hooks/useUsers";
import { toUiBatches } from "@/lib/adapters";
import { adminMetrics, recentActivity } from "@/lib/metrics";
import { deriveLocations } from "@/lib/locations";
import { STAGE_LABEL, STAGE_ORDER } from "@/lib/stages";

export default function AdminOverview() {
  const batchesQ = useBatches();
  const usersQ = useUsers();
  const batches = useMemo(() => (batchesQ.data ? toUiBatches(batchesQ.data) : []), [batchesQ.data]);

  const isLoading = batchesQ.isLoading || usersQ.isLoading;
  const isError = batchesQ.isError || usersQ.isError;

  const operatorCount = (usersQ.data ?? []).filter(
    (u) => u.role === "operator" && u.status === "ACTIVE"
  ).length;

  const byStage = STAGE_ORDER.map((s) => ({
    label: STAGE_LABEL[s],
    value: batches.filter((b) => b.stage === s).length,
  }));

  const locations = deriveLocations(batches, usersQ.data ?? []);

  return (
    <>
      <PageHeader
        title="Monitoring"
        description="Oversee every batch, hub, and on chain record."
      />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Couldn't load dashboard data." onRetry={() => { batchesQ.refetch(); usersQ.refetch(); }} />
      ) : (
        <>
          <StatGrid stats={adminMetrics(batches, operatorCount)} />

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Batches by stage"
                action={
                  <Link href="/admin/batches" className="text-xs font-semibold text-brand hover:underline">
                    View all
                  </Link>
                }
              />
              <div className="p-5">
                {batches.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted">No batches yet.</p>
                ) : (
                  <BarList bars={byStage} />
                )}
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Hub status"
                action={
                  <Link href="/admin/locations" className="text-xs font-semibold text-brand hover:underline">
                    Manage
                  </Link>
                }
              />
              {locations.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted">No hubs yet.</p>
              ) : (
                <ul className="divide-y divide-black/[0.06]">
                  {locations.map((loc) => (
                    <li key={loc.name} className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="font-medium text-brand-dark">{titleCase(loc.name)}</p>
                        <p className="text-xs text-muted">
                          {loc.batches} batches · {loc.active} drying now
                        </p>
                      </div>
                      {loc.batches > 0 ? (
                        <Badge className="bg-mint text-brand" dot="bg-brand">Active</Badge>
                      ) : (
                        <Badge className="bg-black/[0.05] text-muted">Idle</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader
                title="Recent on chain activity"
                action={
                  <Link href="/admin/blockchain" className="text-xs font-semibold text-brand hover:underline">
                    View ledger
                  </Link>
                }
              />
              {batches.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted">No activity yet.</p>
              ) : (
                <ActivityFeed items={recentActivity(batches, 7)} basePath="/admin/batches" />
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
