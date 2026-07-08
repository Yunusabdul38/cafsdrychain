"use client";

import { useState } from "react";
import type { Batch } from "@/lib/types";
import { nextAction } from "@/lib/lifecycle";
import { STAGE_LABEL } from "@/lib/mock-data";
import { Input, Textarea, Select } from "@/components/ui/Field";
import Button, { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import PageHeader from "@/components/dashboard/PageHeader";
import { useAdvanceBatch, type ApiBatch } from "@/lib/hooks/useBatches";
import { ApiError } from "@/lib/api";
import { CheckIcon, LinkIcon } from "@/components/icons";

export default function AdvanceForm({
  batch,
  basePath,
}: {
  batch: Batch;
  basePath: string;
}) {
  const action = nextAction(batch.stage);
  const advance = useAdvanceBatch(batch.id);
  const [done, setDone] = useState<ApiBatch | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!action) {
    return (
      <>
        <PageHeader
          title="Batch complete"
          back={{ href: `${basePath}/${batch.id}`, label: batch.product }}
        />
        <Card className="p-8 text-center">
          <p className="text-brand-dark">
            This batch has been delivered — its lifecycle is complete.
          </p>
          <div className="mt-5">
            <LinkButton href={`${basePath}/${batch.id}`} variant="outline">
              Back to batch
            </LinkButton>
          </div>
        </Card>
      </>
    );
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
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
      setError(err instanceof ApiError ? err.message : "Failed to save. Please try again.");
    }
  };

  if (done) {
    return (
      <>
        <PageHeader
          title="Update saved"
          back={{ href: `${basePath}/${batch.id}`, label: batch.product }}
        />
        <Card className="mx-auto max-w-md p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint text-brand">
            <CheckIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-brand-dark">
            {action.heading} saved
          </h2>
          <p className="mt-2 text-sm text-muted">
            {batch.product} ({batch.id}) is now marked as{" "}
            <span className="font-medium text-brand-dark">{STAGE_LABEL[action.next]}</span>.
          </p>
          <div className="mt-5 rounded-2xl border border-black/[0.08] bg-mint/40 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              On-chain status
            </p>
            {done.txHash ? (
              <p className="mt-1 break-all font-mono text-xs text-brand-dark">
                <a
                  href={`https://sepolia.basescan.org/tx/${done.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline"
                >
                  {done.txHash}
                </a>
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted">
                {done.chainStatus === "PENDING"
                  ? "Recorded — awaiting blockchain confirmation."
                  : `Recorded (${done.chainStatus.toLowerCase()}).`}
              </p>
            )}
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <LinkButton href={`${basePath}/${batch.id}`} full variant="dark">
              View batch
            </LinkButton>
            <LinkButton href={basePath} full variant="outline">
              All batches
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
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Fields stage={batch.stage} />

          <div className="flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-mint/40 px-4 py-3 text-sm text-brand-dark">
            <LinkIcon className="h-5 w-5 shrink-0 text-brand" />
            Saving records this update; the operator wallet signs it on-chain.
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
            <Button type="submit" full size="lg" disabled={advance.isPending}>
              {advance.isPending ? "Saving…" : "Save & record"}
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

function Fields({ stage }: { stage: Batch["stage"] }) {
  const now = new Date().toISOString().slice(0, 16);

  if (stage === "registered") {
    return (
      <>
        <Input id="start" name="start" type="datetime-local" label="Drying start time" defaultValue={now} required />
        <Select id="method" name="method" label="Drying method" defaultValue="Solar tunnel">
          <option>Solar tunnel</option>
          <option>Solar cabinet</option>
          <option>Hybrid solar-electric</option>
        </Select>
        <Textarea id="notes" name="notes" label="Notes (optional)" rows={3} placeholder="Loading, tray count, conditions…" />
      </>
    );
  }

  if (stage === "drying") {
    return (
      <>
        <Input id="end" name="end" type="datetime-local" label="Drying completion time" defaultValue={now} required />
        <div className="grid grid-cols-2 gap-4">
          <Input id="final" name="final" type="number" step="any" label="Final weight (kg)" placeholder="e.g. 96" required />
          <Input id="moisture" name="moisture" type="number" step="any" label="Moisture (%)" placeholder="e.g. 12" required />
        </div>
        <Select id="quality" name="quality" label="Quality grade" defaultValue="Grade A">
          <option>Grade A</option>
          <option>Grade B</option>
          <option>Grade C</option>
        </Select>
        <Textarea id="obs" name="obs" label="Quality observations" rows={3} placeholder="Colour, texture, mould check…" />
      </>
    );
  }

  if (stage === "dried") {
    return (
      <>
        <Input id="storage" name="storage" label="Storage location" placeholder="Warehouse B · Rack 14" required />
        <Input id="packaging" name="packaging" label="Packaging details" placeholder="Vacuum-sealed 2kg pouches" required />
      </>
    );
  }

  if (stage === "stored") {
    return (
      <>
        <Input id="transport" name="transport" label="Transportation" placeholder="GreenLogistics · Truck NG-882" required />
        <Input id="destination" name="destination" label="Destination / buyer" placeholder="FreshMart Distribution · Lagos" required />
      </>
    );
  }

  // in-transit
  return (
    <>
      <Input id="recipient" name="recipient" label="Received by" placeholder="Recipient name" required />
      <Textarea id="dnotes" name="dnotes" label="Delivery notes (optional)" rows={3} />
    </>
  );
}
