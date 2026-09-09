"use client";

import { useState } from "react";
import type { Batch } from "@/lib/types";
import { nextAction } from "@/lib/lifecycle";
import PaymentStep from "@/components/operator/PaymentStep";
import { STAGE_LABEL } from "@/lib/stages";
import { useAdvanceBatch, type ApiBatch } from "@/lib/hooks/useBatches";
import { apiStage } from "@/lib/adapters";
import { useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/dashboard/PageHeader";
import ReceiptCard from "@/components/dashboard/ReceiptCard";
import { Card } from "@/components/ui/Card";
import Button, { LinkButton } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";
import { Spinner } from "@/components/dashboard/States";
import { DateTimePicker } from "@/components/ui/DatePicker";
import { ArrowRightIcon, LinkIcon, PlusIcon } from "@/components/icons";
import { batchSummary, titleCase, formatDateTime } from "@/lib/utils";

/** Shortest run that can be recorded between drying start and completion. */
const MIN_DRYING_MS = 60 * 60 * 1000;

// Map UI stage strings to API enum values for the expectedStage guard.
const UI_TO_API_STAGE: Record<Batch["stage"], string> = {
  registered: "REGISTERED",
  "awaiting-payment": "AWAITING_PAYMENT",
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
  const paid = batch.payment?.status === "PAID";

  // Pricing and collecting the drying fee is its own flow, not a stage form.
  const advance = useAdvanceBatch(batch.id);
  const qc = useQueryClient();
  const [done, setDone] = useState<ApiBatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Every hook above runs unconditionally: this early return has to sit below
  // them, or the hook order changes when a batch moves past the payment stage.
  if (batch.stage === "registered" || (batch.stage === "awaiting-payment" && !paid)) {
    return <PaymentStep batch={batch} basePath={basePath} />;
  }

  if (done) {
    // Keyed by the stage the batch just REACHED. Keying off `batch.stage` was
    // wrong: saving invalidates the batch query, so by the time this rendered
    // the prop had already advanced and the next stage's message was shown.
    const reached = apiStage(done.stage);
    const nextSteps: Partial<Record<Batch["stage"], { title: string; body: string }>> = {
      drying: {
        title: "Drying started",
        body: "The drying clock is now running. Come back when drying is complete to record the final weight and moisture level.",
      },
      dried: {
        title: "Drying complete",
        body: "The quality data is recorded. Record the delivery details once the batch reaches the buyer.",
      },
      delivered: {
        title: "Delivery confirmed",
        body: "This batch has completed its full lifecycle. Every record is permanent.",
      },
    };

    const step = nextSteps[reached];

    return (
      <ReceiptCard
          eyebrow="Step recorded"
          title={step?.title ?? `${action?.heading} saved`}
          subtitle={`${titleCase(batch.product)} · ${titleCase(batch.location)}`}
          rows={[
            { label: "Batch", value: batch.id },
            { label: "Stage", value: STAGE_LABEL[reached] },
            { label: "Recorded", value: formatDateTime(new Date().toISOString()) },
            { label: "Final weight", value: done.finalWeight ? `${done.finalWeight} kg` : null },
            { label: "Drying method", value: titleCase(done.dryingMethod) },
            { label: "Moisture", value: done.moisture != null ? `${done.moisture}%` : null },
            { label: "Quality", value: titleCase(done.quality) },
            { label: "Destination", value: titleCase(done.destination) },
          ]}
        >
          <p className="text-center text-sm leading-relaxed text-muted">
            {step?.body ?? `This batch is now marked as ${STAGE_LABEL[reached]}.`}
          </p>
          <div className="mt-5">
            <LinkButton href={`${basePath}/${batch.id}`} full variant="dark">
              Back to batch details
            </LinkButton>
          </div>
          {done.txHash && (
            <a
              href={`https://sepolia.basescan.org/tx/${done.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-brand"
            >
              <LinkIcon className="h-3.5 w-3.5" /> View the on chain record
            </a>
          )}
      </ReceiptCard>
    );
  }

  if (!action) {
    return (
      <ReceiptCard
          eyebrow="Lifecycle complete"
          title="Batch delivered"
          subtitle={`${titleCase(batch.product)} · ${titleCase(batch.location)}`}
          rows={[
            { label: "Batch", value: batch.id },
            { label: "Fresh weight", value: `${batch.freshWeight} kg` },
            { label: "Final weight", value: batch.finalWeight ? `${batch.finalWeight} kg` : null },
            { label: "Moisture", value: batch.moisture != null ? `${batch.moisture}%` : null },
            { label: "Quality", value: titleCase(batch.quality) },
            { label: "Drying hub", value: titleCase(batch.location) },
            { label: "Destination", value: titleCase(batch.destination) },
          ]}
        >
          <p className="text-center text-sm leading-relaxed text-muted">
            Every stage, drying, storage and delivery, is recorded and cannot
            be altered.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <LinkButton href={`${basePath}/${batch.id}`} full variant="dark">
              View batch record <ArrowRightIcon className="h-5 w-5" />
            </LinkButton>
            <LinkButton href="/operator/register" full variant="outline">
              <PlusIcon className="h-5 w-5" /> Register new batch
            </LinkButton>
          </div>
      </ReceiptCard>
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

    // Every free-text field the operator can fill on this step, kept together.
    // The old `a ?? b ?? c` picked one and silently dropped the rest — on the
    // delivery step that meant the recipient's name won and the notes vanished.
    function composeNote() {
      const recipient = str("recipient");
      const parts = [
        str("notes"),
        str("obs"),
        recipient ? `Received by ${recipient}` : undefined,
        str("dnotes"),
      ].filter(Boolean);
      return parts.length ? parts.join(" · ") : undefined;
    }

    const payload = {
      // Optimistic lock: tell the server what stage we expect the batch to be in.
      // If another operator already advanced it, the server returns 409.
      expectedStage: UI_TO_API_STAGE[batch.stage],
      dryingStart: str("start"),
      dryingEnd: str("end"),
      dryingMethod: str("method"),
      finalWeight: num("final"),
      moisture: num("moisture"),
      quality: str("quality"),
      destination: str("destination"),
      notes: composeNote(),
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

  return (
    <>
      <PageHeader
        title={action.heading}
        description={batchSummary(batch)}
        back={{ href: `${basePath}/${batch.id}`, label: titleCase(batch.product) }}
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

          <Fields stage={batch.stage} errors={fieldErrors} dryingStart={batch.dryingStart} />

          <div className="flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-mint/40 px-4 py-3 text-sm text-brand-dark">
            <LinkIcon className="h-5 w-5 shrink-0 text-brand" />
            Saving records this update; the operator wallet signs it on chain.
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

function Fields({
  stage,
  errors,
  dryingStart,
}: {
  stage: Batch["stage"];
  errors: Record<string, string[]>;
  /** Bounds the completion time: drying must finish after it began. */
  dryingStart?: string;
}) {
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

  if (stage === "awaiting-payment") {
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
          <option>Hybrid solar electric</option>
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
          // Solar drying takes hours, so completion is held to at least an
          // hour after the start rather than merely "later".
          min={
            dryingStart
              ? new Date(new Date(dryingStart).getTime() + MIN_DRYING_MS)
              : undefined
          }
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

  if (stage === "dried" || stage === "stored") {
    return (
      <>
        <Input
          id="destination"
          name="destination"
          label="Destination / buyer"
          placeholder="Ọjà Ọba Traders · Abẹ́òkúta"
          required
          error={errors.destination?.[0]}
        />
        <Input
          id="recipient"
          name="recipient"
          label="Received by"
          placeholder="Olúwáségun Adébáyọ̀"
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

  // in-transit
  return (
    <>
      <Input
        id="recipient"
        name="recipient"
        label="Received by"
        placeholder="Olúwáségun Adébáyọ̀"
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
