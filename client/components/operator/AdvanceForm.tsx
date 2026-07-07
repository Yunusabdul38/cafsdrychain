"use client";

import Link from "next/link";
import { useState } from "react";
import type { Batch } from "@/lib/types";
import { nextAction } from "@/lib/lifecycle";
import { STAGE_LABEL } from "@/lib/mock-data";
import { Input, Textarea, Select } from "@/components/ui/Field";
import Button, { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import PageHeader from "@/components/dashboard/PageHeader";
import { CheckIcon, LinkIcon } from "@/components/icons";

function fakeTx() {
  const hex = "0123456789abcdef";
  let s = "0x";
  for (let i = 0; i < 40; i++) s += hex[Math.floor(Math.random() * 16)];
  return s;
}

export default function AdvanceForm({
  batch,
  basePath,
}: {
  batch: Batch;
  basePath: string;
}) {
  const action = nextAction(batch.stage);
  const [status, setStatus] = useState<"idle" | "writing" | "done">("idle");
  const [tx] = useState(fakeTx());

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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("writing");
    setTimeout(() => setStatus("done"), 1400);
  };

  if (status === "done") {
    return (
      <>
        <PageHeader
          title="Recorded on-chain"
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
            <span className="font-medium text-brand-dark">
              {STAGE_LABEL[action.next]}
            </span>
            . The update is permanently recorded on the Base blockchain.
          </p>
          <div className="mt-5 rounded-2xl border border-black/[0.08] bg-mint/40 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              Transaction hash
            </p>
            <p className="mt-1 break-all font-mono text-xs text-brand-dark">
              {tx}
            </p>
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
          <Fields stage={batch.stage} />

          <div className="flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-mint/40 px-4 py-3 text-sm text-brand-dark">
            <LinkIcon className="h-5 w-5 shrink-0 text-brand" />
            Saving will write an immutable record to the Base blockchain.
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
            <Button type="submit" full size="lg" disabled={status === "writing"}>
              {status === "writing" ? "Writing to chain…" : `Save & record`}
            </Button>
            <LinkButton
              href={`${basePath}/${batch.id}`}
              full
              size="lg"
              variant="outline"
            >
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
        <Input
          id="start"
          type="datetime-local"
          label="Drying start time"
          defaultValue={now}
          required
        />
        <Select id="method" label="Drying method" defaultValue="Solar tunnel">
          <option>Solar tunnel</option>
          <option>Solar cabinet</option>
          <option>Hybrid solar-electric</option>
        </Select>
        <Textarea id="notes" label="Notes (optional)" rows={3} placeholder="Loading, tray count, conditions…" />
      </>
    );
  }

  if (stage === "drying") {
    return (
      <>
        <Input
          id="end"
          type="datetime-local"
          label="Drying completion time"
          defaultValue={now}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input id="final" type="number" label="Final weight (kg)" placeholder="e.g. 96" required />
          <Input id="moisture" type="number" label="Moisture (%)" placeholder="e.g. 12" required />
        </div>
        <Select id="quality" label="Quality grade" defaultValue="Grade A">
          <option>Grade A</option>
          <option>Grade B</option>
          <option>Grade C</option>
        </Select>
        <Textarea id="obs" label="Quality observations" rows={3} placeholder="Colour, texture, mould check…" />
      </>
    );
  }

  if (stage === "dried") {
    return (
      <>
        <Input id="storage" label="Storage location" placeholder="Warehouse B · Rack 14" required />
        <Input id="packaging" label="Packaging details" placeholder="Vacuum-sealed 2kg pouches" required />
        <Input id="stored-at" type="datetime-local" label="Stored at" defaultValue={now} required />
      </>
    );
  }

  if (stage === "stored") {
    return (
      <>
        <Input id="transport" label="Transportation" placeholder="GreenLogistics · Truck NG-882" required />
        <Input id="destination" label="Destination / buyer" placeholder="FreshMart Distribution · Lagos" required />
        <Input id="dispatch" type="datetime-local" label="Dispatch time" defaultValue={now} required />
      </>
    );
  }

  // in-transit
  return (
    <>
      <Input id="recipient" label="Received by" placeholder="Recipient name" required />
      <Input id="delivered" type="datetime-local" label="Delivery time" defaultValue={now} required />
      <Textarea id="dnotes" label="Delivery notes (optional)" rows={3} />
    </>
  );
}
