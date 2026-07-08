"use client";

import { useMemo } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/dashboard/States";
import { useBatches } from "@/lib/hooks/useBatches";
import { useUsers } from "@/lib/hooks/useUsers";
import { toUiBatches } from "@/lib/adapters";
import { deriveLocations } from "@/lib/locations";
import { BuildingIcon } from "@/components/icons";

export default function AdminLocations() {
  const batchesQ = useBatches();
  const usersQ = useUsers();
  const batches = useMemo(() => (batchesQ.data ? toUiBatches(batchesQ.data) : []), [batchesQ.data]);
  const locations = deriveLocations(batches, usersQ.data ?? []);

  const isLoading = batchesQ.isLoading || usersQ.isLoading;
  const isError = batchesQ.isError || usersQ.isError;

  return (
    <>
      <PageHeader title="Locations" description="Solar drying hubs across the network." />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Couldn't load locations." onRetry={() => { batchesQ.refetch(); usersQ.refetch(); }} />
      ) : locations.length === 0 ? (
        <EmptyState
          icon={<BuildingIcon className="h-6 w-6" />}
          title="No hubs yet"
          description="Hubs appear once operators and batches are assigned to a location."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => (
            <Card key={loc.name} className="p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint text-brand">
                  <BuildingIcon className="h-5 w-5" />
                </span>
                {loc.batches > 0 ? (
                  <Badge className="bg-mint text-brand" dot="bg-brand">Active</Badge>
                ) : (
                  <Badge className="bg-black/[0.05] text-muted">Idle</Badge>
                )}
              </div>
              <p className="mt-4 font-semibold text-brand-dark">{loc.name}</p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <Stat value={loc.batches} label="Batches" />
                <Stat value={loc.active} label="Drying" />
                <Stat value={loc.operators} label="Operators" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-lg font-semibold text-brand-dark">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
