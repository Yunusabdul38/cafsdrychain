"use client";

import { useState } from "react";
import type { Batch } from "@/lib/types";
import { nextAction } from "@/lib/lifecycle";
import { STAGE_LABEL } from "@/lib/mock-data";
import { useAdvanceBatch, type ApiBatch } from "@/lib/hooks/useBatches";
import { useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/Card";
import Button, { LinkButton } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";
import { Spinner } from "@/components/dashboard/States";
import { DateTimePicker } from "@/components/ui/DatePicker";
import { StageBadge, VerifiedBadge } from "@/components/ui/Badge";
import { ArrowRightIcon, CheckIcon, LeafIcon, LinkIcon, PinIcon, PlusIcon, SunIcon, TruckIcon } from "@/components/icons";

// Map UI stage strings to API enum values for the expectedStage guard.
const UI_TO_API_STAGE: Record<Batch["stage"], string> = {
  registered: "REGISTERED",
  drying: "DRYING",
  dried: "DRIED",
  stored: "STORED",
  "in-transit": "IN_TRANSIT",
  delivered: "DELIVERED",
};

export default function AdvanceForm({
  batch,
  basePath,
}: {
  batch: Batch;
  basePath: string;
}) {
  const action = nextAction(batch.stage);
  const advance = useAdvanceBatch(batch.id);
  const qc = useQueryClient();
  const [done, setDone] = useState<ApiBatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  if (!action) {
    return (
      <>
        <PageHeader
          title="Batch Complete"
          description={`${batch.product} · ${batch.id}`}
          back={{ href: `${basePath}/${batch.id}`, label: batch.product }}
        />

        <div className="mx-auto max-w-2xl space-y-6">
          {/* Main Hero Card */}
          <Card className="relative overflow-hidden p-8 sm:p-10 text-center border-black/[0.08] shadow-sm">
            {/* Soft decorative background glows */}
            <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-brand/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-mint blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              {/* Glowing Check Icon */}
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-mint border border-brand/20 shadow-md shadow-brand/5 text-brand">
                <CheckIcon className="h-10 w-10 stroke-[2.5]" />
              </div>

              <div className="flex items-center justify-center gap-2 mb-3">
                <StageBadge stage={batch.stage} />
                {batch.verified && <VerifiedBadge />}
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
                Batch Lifecycle Complete
              </h2>

              <p className="mt-2.5 max-w-md text-sm text-muted leading-relaxed">
                This batch has successfully completed all processing, drying, storage, and final delivery stages with an immutable record recorded on-chain.
              </p>

              {/* Summary Stats Grid */}
              <div className="mt-8 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.06] bg-mint/40 p-4 text-center">
                  <LeafIcon className="h-5 w-5 text-brand mb-1" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Fresh</span>
                  <span className="mt-0.5 text-base font-bold text-brand-dark">{batch.freshWeight} kg</span>
                </div>

                <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.06] bg-mint/40 p-4 text-center">
                  <SunIcon className="h-5 w-5 text-brand mb-1" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Final</span>
                  <span className="mt-0.5 text-base font-bold text-brand-dark">
                    {batch.finalWeight ? `${batch.finalWeight} kg` : "—"}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.06] bg-mint/40 p-4 text-center">
                  <PinIcon className="h-5 w-5 text-brand mb-1" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Facility</span>
                  <span className="mt-0.5 text-xs font-bold text-brand-dark truncate max-w-full" title={batch.location}>
                    {batch.location}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.06] bg-mint/40 p-4 text-center">
                  <TruckIcon className="h-5 w-5 text-brand mb-1" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Destination</span>
                  <span className="mt-0.5 text-xs font-bold text-brand-dark truncate max-w-full" title={batch.destination || "Delivered"}>
                    {batch.destination || "Delivered"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
                <LinkButton href={`${basePath}/${batch.id}`} size="lg" className="w-full sm:w-auto">
                  View Batch Record <ArrowRightIcon className="h-5 w-5" />
                </LinkButton>
                <LinkButton href="/operator/register" variant="outline" size="lg" className="w-full sm:w-auto">
                  <PlusIcon className="h-5 w-5" /> Register New Batch
                </LinkButton>
              </div>

              <div className="mt-4">
                <LinkButton href={basePath} variant="ghost" size="sm" className="text-muted hover:text-brand-dark">
                  Back to All Batches
                </LinkButton>
              </div>
            </div>
          </Card>
        </div>
      </>
    );
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setAlreadyDone(false);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const str = (k: string) => {
      const v = fd.get(k);
      return v ? String(v) : undefined;
    };
    const num = (k: string) => {
      const v = fd.get(k);
      return v ? Number(v) : undefined;
    };

    const payload = {
      // Optimistic lock: tell the server what stage we expect the batch to be in.
      // If another operator already advanced it, the server returns 409.
      expectedStage: UI_TO_API_STAGE[batch.stage],
      dryingStart: str("start"),
      dryingEnd: str("end"),
      finalWeight: num("final"),
      moisture: num("moisture"),
      quality: str("quality"),
      storageLocation: str("storage"),
      packaging: str("packaging"),
      transport: str("transport"),
      destination: str("destination"),
      notes: str("notes") ?? str("obs") ?? str("recipient") ?? str("dnotes"),
    };
    // Drop undefined keys so the API only receives provided fields.
    const clean = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined)
    );

    try {
      const { batch: updated } = await advance.mutateAsync(clean);
      setDone(updated);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          // Another operator already recorded this step. Refresh the batch
          // so the UI updates to reflect the actual current stage.
          setAlreadyDone(true);
          qc.invalidateQueries({ queryKey: ["batch", batch.id] });
          qc.invalidateQueries({ queryKey: ["batches"] });
        } else if (err.details && typeof err.details === "object") {
          setFieldErrors(err.details as Record<string, string[]>);
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to save. Please try again.");
      }
    }
  };

  if (done) {
    // Stage-specific descriptive success messages
    const successMessages: Partial<Record<Batch["stage"], { title: string; body: string }>> = {
      registered: {
        title: "Drying process started!",
        body: `The drying clock is now running for ${batch.product} (${batch.id}). This record has been signed and written on-chain. Come back when drying is complete to record the final weight and moisture level.`,
      },
      drying: {
        title: "Drying complete — batch dried!",
        body: `${batch.product} (${batch.id}) has been marked as dried and the quality data recorded on-chain. Next step: move the batch to storage and enter the storage location and packaging details.`,
      },
      dried: {
        title: "Stored successfully!",
        body: `${batch.product} (${batch.id}) is now in storage. The location and packaging details have been saved on-chain. When you're ready to ship, record the distribution details to move it to in-transit.`,
      },
      stored: {
        title: "Dispatched — batch in transit!",
        body: `${batch.product} (${batch.id}) has been dispatched and is now in transit. The transport and destination details are recorded on-chain. Confirm delivery once the buyer acknowledges receipt.`,
      },
      "in-transit": {
        title: "Delivery confirmed!",
        body: `${batch.product} (${batch.id}) has been delivered and the supply chain lifecycle is now complete. All records are permanently stored on-chain.`,
      },
    };

    const msg = successMessages[batch.stage];

    return (
      <>
        <PageHeader
          title={msg?.title ?? "Update saved"}
          back={{ href: `${basePath}/${batch.id}`, label: batch.product }}
        />
        <Card className="mx-auto max-w-md p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint text-brand">
            <CheckIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-brand-dark">
            {msg?.title ?? `${action?.heading} saved`}
          </h2>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            {msg?.body ?? `${batch.product} (${batch.id}) is now marked as ${STAGE_LABEL[action!.next]}.`}
          </p>
          {done.txHash && (
            <div className="mt-5 rounded-2xl border border-black/[0.08] bg-mint/40 p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand flex items-center gap-1">
                <LinkIcon className="h-4 w-4" /> On-chain record
              </p>
              <p className="mt-1.5 break-all font-mono text-[11px] text-brand-dark leading-normal">
                {done.txHash}
              </p>
              <a
                href={`https://sepolia.basescan.org/tx/${done.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
              >
                View block explorer <LinkIcon className="h-3 w-3" />
              </a>
            </div>
          )}
          <div className="mt-6">
            <LinkButton href={`${basePath}/${batch.id}`} full variant="dark">
              Back to batch details
            </LinkButton>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={action.heading}
        description={`${batch.product} · ${batch.id}`}
        back={{ href: `${basePath}/${batch.id}`, label: batch.product }}
      />

      <Card className="mx-auto max-w-xl p-5 sm:p-7">
        <form onSubmit={onSubmit} className="space-y-4">
          {alreadyDone && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 font-medium">
              <p className="font-semibold">This step was already recorded.</p>
              <p className="mt-0.5 text-amber-700">Another operator at your hub has already completed this stage. The page is refreshing with the latest batch status&hellip;</p>
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          <Fields stage={batch.stage} errors={fieldErrors} />

          <div className="flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-mint/40 px-4 py-3 text-sm text-brand-dark">
            <LinkIcon className="h-5 w-5 shrink-0 text-brand" />
            Saving records this update; the operator wallet signs it on-chain.
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
            <Button type="submit" full size="lg" disabled={advance.isPending}>
              {advance.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner className="h-5 w-5 animate-spin text-white" />
                  Saving & recording…
                </span>
              ) : (
                "Save & record"
              )}
            </Button>
            <LinkButton href={`${basePath}/${batch.id}`} full size="lg" variant="outline">
              Cancel
            </LinkButton>
          </div>
        </form>
      </Card>
    </>
  );
}

function Fields({ stage, errors }: { stage: Batch["stage"]; errors: Record<string, string[]> }) {
  // Build an ISO 8601 string in the user's LOCAL timezone (e.g. "2026-08-01T15:55:00+01:00")
  // so the pre-filled time matches the operator's wall clock, not UTC.
  const localNow = (() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? "+" : "-";
    const absOff = Math.abs(off);
    const offStr = `${sign}${pad(Math.floor(absOff / 60))}:${pad(absOff % 60)}`;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${offStr}`;
  })();

  if (stage === "registered") {
    return (
      <>
        <DateTimePicker
          id="start"
          name="start"
          label="Drying start time"
          defaultValue={localNow}
          required
          error={errors.dryingStart?.[0]}
        />
        <Select
          id="method"
          name="method"
          label="Drying method"
          defaultValue="Solar tunnel"
          error={errors.dryingMethod?.[0]}
        >
          <option>Solar tunnel</option>
          <option>Solar cabinet</option>
          <option>Hybrid solar-electric</option>
        </Select>
        <Textarea
          id="notes"
          name="notes"
          label="Notes (optional)"
          rows={3}
          placeholder="Loading, tray count, conditions…"
          error={errors.notes?.[0]}
        />
      </>
    );
  }

  if (stage === "drying") {
    return (
      <>
        <DateTimePicker
          id="end"
          name="end"
          label="Drying completion time"
          defaultValue={localNow}
          required
          error={errors.dryingEnd?.[0]}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="final"
            name="final"
            type="number"
            step="any"
            label="Final weight (kg)"
            placeholder="e.g. 96"
            required
            error={errors.finalWeight?.[0]}
          />
          <Input
            id="moisture"
            name="moisture"
            type="number"
            step="any"
            label="Moisture (%)"
            placeholder="e.g. 12"
            required
            error={errors.moisture?.[0]}
          />
        </div>
        <Select
          id="quality"
          name="quality"
          label="Quality grade"
          defaultValue="Grade A"
          error={errors.quality?.[0]}
        >
          <option>Grade A</option>
          <option>Grade B</option>
          <option>Grade C</option>
        </Select>
        <Textarea
          id="obs"
          name="obs"
          label="Quality observations"
          rows={3}
          placeholder="Colour, texture, mould check…"
          error={errors.notes?.[0]}
        />
      </>
    );
  }

  if (stage === "dried") {
    return (
      <>
        <Input
          id="storage"
          name="storage"
          label="Storage location"
          placeholder="Warehouse B · Rack 14"
          required
          error={errors.storageLocation?.[0]}
        />
        <Input
          id="packaging"
          name="packaging"
          label="Packaging details"
          placeholder="Vacuum-sealed 2kg pouches"
          required
          error={errors.packaging?.[0]}
        />
      </>
    );
  }

  if (stage === "stored") {
    return (
      <>
        <Input
          id="transport"
          name="transport"
          label="Transportation"
          placeholder="GreenLogistics · Truck NG-882"
          required
          error={errors.transport?.[0]}
        />
        <Input
          id="destination"
          name="destination"
          label="Destination / buyer"
          placeholder="FreshMart Distribution · Lagos"
          required
          error={errors.destination?.[0]}
        />
      </>
    );
  }

  // in-transit
  return (
    <>
      <Input
        id="recipient"
        name="recipient"
        label="Received by"
        placeholder="Recipient name"
        required
        error={errors.notes?.[0]}
      />
      <Textarea
        id="dnotes"
        name="dnotes"
        label="Delivery notes (optional)"
        rows={3}
        error={errors.notes?.[0]}
      />
    </>
  );
}
