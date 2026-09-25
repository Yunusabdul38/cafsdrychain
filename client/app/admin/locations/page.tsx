"use client";

import { titleCase } from "@/lib/utils";
import { useMemo, useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState, EmptyState, Spinner } from "@/components/dashboard/States";
import { useBatches } from "@/lib/hooks/useBatches";
import { useUsers } from "@/lib/hooks/useUsers";
import { useLocations, useCreateLocation, useUpdateLocation } from "@/lib/hooks/useLocations";
import { useSettings } from "@/lib/hooks/useAdmin";
import Switch from "@/components/ui/Switch";
import { toUiBatches } from "@/lib/adapters";
import { BuildingIcon, PlusIcon, PencilIcon, CheckIcon } from "@/components/icons";
import { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

export default function AdminLocations() {
  const batchesQ = useBatches();
  const usersQ = useUsers();
  const locationsQ = useLocations();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const { data: settings } = useSettings();
  // The master switch. With fees off globally, per-hub choices are inert, so
  // the switches render off and disabled rather than lying about what happens.
  const feesOn = settings?.feesEnabled ?? false;
  const [togglingId, setTogglingId] = useState<string | null>(null);
  // Confirmation is per hub, keyed by id: with several switches on one screen a
  // single shared banner could not say which change actually landed.
  const [feeSaved, setFeeSaved] = useState<string | null>(null);
  const [feeError, setFeeError] = useState<{ id: string; message: string } | null>(null);

  const toggleFees = async (id: string, feesEnabled: boolean) => {
    setFeeError(null);
    setFeeSaved(null);
    setTogglingId(id);
    try {
      // Only after this resolves does the switch move: it is driven by the
      // server's own response, so a dropped connection cannot leave an admin
      // looking at a change that was never written.
      await updateLocation.mutateAsync({ id, feesEnabled });
      setFeeSaved(id);
      setTimeout(() => setFeeSaved((cur) => (cur === id ? null : cur)), 3000);
    } catch {
      setFeeError({ id, message: "Not saved — check your connection and try again." });
    } finally {
      setTogglingId(null);
    }
  };

  // `null` = closed, `{ id: null }` = adding, `{ id }` = renaming that hub.
  const [dialog, setDialog] = useState<{ id: string | null } | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = Boolean(dialog?.id);
  const isSaving = createLocation.isPending || updateLocation.isPending;

  const openAdd = () => {
    setDialog({ id: null });
    setNameInput("");
    setFormError(null);
  };

  const openEdit = (loc: { id: string; name: string }) => {
    setDialog({ id: loc.id });
    setNameInput(loc.name);
    setFormError(null);
  };

  const closeDialog = () => {
    setDialog(null);
    setNameInput("");
    setFormError(null);
  };

  const batches = useMemo(() => (batchesQ.data ? toUiBatches(batchesQ.data) : []), [batchesQ.data]);

  const locations = useMemo(() => {
    if (!locationsQ.data) return [];
    return locationsQ.data
      .map((loc) => ({
        id: loc.id,
        name: loc.name,
        feesEnabled: loc.feesEnabled,
        batches: batches.filter((b) => b.location === loc.name).length,
        active: batches.filter((b) => b.location === loc.name && b.stage === "drying").length,
        operators: (usersQ.data ?? []).filter((u) => u.location === loc.name && u.role === "operator").length,
      }))
      .sort((a, b) => b.batches - a.batches);
  }, [locationsQ.data, batches, usersQ.data]);

  const isLoading = batchesQ.isLoading || usersQ.isLoading || locationsQ.isLoading;
  const isError = batchesQ.isError || usersQ.isError || locationsQ.isError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const name = nameInput.trim();
    if (!name || !dialog) return;
    try {
      if (dialog.id) {
        await updateLocation.mutateAsync({ id: dialog.id, name });
      } else {
        await createLocation.mutateAsync({ name });
      }
      closeDialog();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : `Failed to ${dialog.id ? "rename" : "create"} location`
      );
    }
  };

  return (
    <>
      <PageHeader
        title="Locations"
        description="Solar drying hubs across the network."
        action={
          <Button onClick={openAdd}>
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
            <Button onClick={openAdd}>
              <PlusIcon className="h-5 w-5" /> Add location
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => (
            <Card key={loc.id} className="p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint text-brand">
                  <BuildingIcon className="h-5 w-5" />
                </span>
                <div className="flex items-center gap-2">
                  {loc.batches > 0 ? (
                    <Badge className="bg-mint text-brand" dot="bg-brand">Active</Badge>
                  ) : (
                    <Badge className="bg-black/[0.05] text-muted">Idle</Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(loc)}
                    aria-label={`Rename ${loc.name}`}
                    title="Rename hub"
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-muted transition-colors hover:bg-mint hover:text-brand"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-4 font-semibold text-brand-dark">{titleCase(loc.name)}</p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <Stat value={loc.batches} label="Batches" />
                <Stat value={loc.active} label="Drying" />
                <Stat value={loc.operators} label="Operators" />
              </div>

              {/* Only meaningful while fees are on globally: with the master
                  switch off nothing is collected anywhere, so showing a live
                  control here would promise something it cannot deliver. */}
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/[0.06] pt-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brand-dark">Drying fee</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    {!feesOn
                      ? "Fees are off for every hub"
                      : loc.feesEnabled
                      ? "Suppliers pay before drying starts"
                      : "Drying starts with no payment"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {togglingId === loc.id && (
                    <Spinner className="h-4 w-4 animate-spin text-brand" />
                  )}
                  <Switch
                    checked={feesOn && loc.feesEnabled}
                    disabled={!feesOn || togglingId === loc.id}
                    label={`Collect a drying fee at ${loc.name}`}
                    onChange={(next) => toggleFees(loc.id, next)}
                  />
                </div>
              </div>

              {feeSaved === loc.id && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand">
                  <CheckIcon className="h-3.5 w-3.5" />
                  Saved. This hub {loc.feesEnabled ? "now charges" : "no longer charges"} a fee.
                </p>
              )}
              {feeError?.id === loc.id && (
                <p className="mt-2 text-xs font-medium text-red-600">{feeError.message}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {dialog && (
        <Modal onClose={closeDialog} labelledBy="location-dialog-title">
            <h3 id="location-dialog-title" className="text-lg font-semibold text-brand-dark">
              {isEditing ? "Rename location" : "Add location"}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {isEditing
                ? "Fix a typo or update the hub name. Operators and batches at this hub follow the new name."
                : "Register a new solar drying facility."}
            </p>
            {formError && (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-600">
                {formError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <Input
                id="location-name"
                label="Location Name"
                placeholder="E.g. Ibadan Solar Hub"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                required
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSaving}>
                  {isSaving
                    ? isEditing
                      ? "Saving..."
                      : "Adding..."
                    : isEditing
                      ? "Save changes"
                      : "Add location"}
                </Button>
              </div>
            </form>
        </Modal>
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

