"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/dashboard/States";
import { useBatches } from "@/lib/hooks/useBatches";
import { useUsers } from "@/lib/hooks/useUsers";
import { useLocations, useCreateLocation } from "@/lib/hooks/useLocations";
import { toUiBatches } from "@/lib/adapters";
import { BuildingIcon, PlusIcon, CloseIcon } from "@/components/icons";
import { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

export default function AdminLocations() {
  const batchesQ = useBatches();
  const usersQ = useUsers();
  const locationsQ = useLocations();
  const createLocation = useCreateLocation();

  const [isAdding, setIsAdding] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const batches = useMemo(() => (batchesQ.data ? toUiBatches(batchesQ.data) : []), [batchesQ.data]);

  const locations = useMemo(() => {
    if (!locationsQ.data) return [];
    return locationsQ.data
      .map((loc) => ({
        id: loc.id,
        name: loc.name,
        batches: batches.filter((b) => b.location === loc.name).length,
        active: batches.filter((b) => b.location === loc.name && b.stage === "drying").length,
        operators: (usersQ.data ?? []).filter((u) => u.location === loc.name && u.role === "operator").length,
      }))
      .sort((a, b) => b.batches - a.batches);
  }, [locationsQ.data, batches, usersQ.data]);

  const isLoading = batchesQ.isLoading || usersQ.isLoading || locationsQ.isLoading;
  const isError = batchesQ.isError || usersQ.isError || locationsQ.isError;

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!nameInput.trim()) return;
    try {
      await createLocation.mutateAsync({ name: nameInput.trim() });
      setIsAdding(false);
      setNameInput("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to create location");
    }
  };

  return (
    <>
      <PageHeader
        title="Locations"
        description="Solar drying hubs across the network."
        action={
          <Button onClick={() => setIsAdding(true)}>
            <PlusIcon className="h-5 w-5" /> Add location
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState
          message="Couldn't load locations."
          onRetry={() => {
            batchesQ.refetch();
            usersQ.refetch();
            locationsQ.refetch();
          }}
        />
      ) : locations.length === 0 ? (
        <EmptyState
          icon={<BuildingIcon className="h-6 w-6" />}
          title="No hubs yet"
          description="Create your first location hub to get started."
          action={
            <Button onClick={() => setIsAdding(true)}>
              <PlusIcon className="h-5 w-5" /> Add location
            </Button>
          }
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

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 relative bg-white shadow-xl animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => {
                setIsAdding(false);
                setNameInput("");
                setAddError(null);
              }}
              className="absolute right-4 top-4 text-muted hover:text-brand-dark"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold text-brand-dark">Add location</h3>
            <p className="mt-1 text-sm text-muted">Register a new solar drying facility.</p>
            {addError && (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-600">
                {addError}
              </div>
            )}
            <form onSubmit={handleAddLocation} className="mt-4 space-y-4">
              <Input
                id="new-location-name"
                label="Location Name"
                placeholder="E.g. Lagos Solar Hub"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                required
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAdding(false);
                    setNameInput("");
                    setAddError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={createLocation.isPending}>
                  {createLocation.isPending ? "Adding..." : "Add location"}
                </Button>
              </div>
            </form>
          </Card>
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

