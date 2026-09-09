import DetailRow from "@/components/ui/DetailRow";
import type { Batch } from "@/lib/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { StageBadge, VerifiedBadge } from "@/components/ui/Badge";
import PageHeader from "@/components/dashboard/PageHeader";
import StageProgress from "@/components/dashboard/StageProgress";
import Timeline from "@/components/dashboard/Timeline";
import { formatDate, formatDateTime, cn, titleCase } from "@/lib/utils";
import { CheckIcon, ClockIcon } from "@/components/icons";

/**
 * The public traceability record.
 *
 * Deliberately laid out like the operator's batch detail page — same header,
 * badges, progress bar and card grid — so the record a buyer sees is visibly
 * the same record the hub works from, not a separate marketing view of it.
 */
export default function PublicRecord({
  batch,
  onChainValid,
}: {
  batch: Batch;
  onChainValid?: boolean;
}) {
  const verified = batch.verified || onChainValid;

  return (
    <>
      <PageHeader
        title={titleCase(batch.product)}
        description={`${titleCase(batch.source)} (${batch.sourceType}) · ${titleCase(
          batch.location
        )} · Entered ${formatDate(batch.entryDate)}`}
        back={{ href: "/verify", label: "Verify another" }}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <StageBadge stage={batch.stage} />
        {verified && <VerifiedBadge />}
      </div>

      {/* Progress */}
      <Card className="mb-6 p-5">
        <StageProgress stage={batch.stage} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Produce" />
            <dl className="divide-y divide-black/[0.06]">
              <DetailRow label="Category" value={titleCase(batch.category)} />
              <DetailRow label="Product" value={titleCase(batch.product)} />
              <DetailRow
                label="Source"
                value={`${titleCase(batch.source)} (${batch.sourceType})`}
              />
              <DetailRow label="Fresh weight" value={`${batch.freshWeight} kg`} />
              <DetailRow label="Entry date" value={formatDate(batch.entryDate)} />
              <DetailRow label="Drying hub" value={titleCase(batch.location)} />
            </dl>
          </Card>

          <Card>
            <CardHeader title="Drying record" />
            <dl className="divide-y divide-black/[0.06]">
              <DetailRow
                label="Started"
                value={batch.dryingStart ? formatDateTime(batch.dryingStart) : undefined}
              />
              <DetailRow
                label="Completed"
                value={batch.dryingEnd ? formatDateTime(batch.dryingEnd) : undefined}
              />
              <DetailRow
                label="Final weight"
                value={batch.finalWeight ? `${batch.finalWeight} kg` : undefined}
              />
              <DetailRow
                label="Moisture"
                value={batch.moisture !== undefined ? `${batch.moisture}%` : undefined}
              />
              <DetailRow label="Drying method" value={titleCase(batch.dryingMethod)} />
              <DetailRow label="Quality" value={titleCase(batch.quality)} />
            </dl>
          </Card>

          <Card>
            <CardHeader title="Distribution" />
            <dl className="divide-y divide-black/[0.06]">
              <DetailRow label="Destination" value={titleCase(batch.destination)} />
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Traceability timeline" />
            <div className="p-5">
              <Timeline events={batch.timeline} />
            </div>
          </Card>
        </div>
      </div>

      {/* Verification seal — closes the record, after the evidence above it */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-black/[0.08] bg-white">
        <div
          className={cn(
            "px-6 py-7 text-center sm:px-8",
            verified ? "bg-mint/40" : "bg-[#FFF3E0]"
          )}
        >
          <span
            className={cn(
              "mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white",
              verified ? "bg-brand" : "bg-[#B4740B]"
            )}
          >
            {verified ? (
              <CheckIcon className="h-7 w-7" />
            ) : (
              <ClockIcon className="h-7 w-7" />
            )}
          </span>

          <h2 className="mt-4 text-xl font-semibold tracking-tight text-brand-dark">
            {verified ? "Authentic & verified" : "Recorded, pending confirmation"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            {verified
              ? "Every record above was written to the blockchain and matches its on chain fingerprint. It cannot be altered after the fact."
              : "This record exists and has been submitted to the blockchain. It is awaiting on chain confirmation."}
          </p>
        </div>

        <div className="border-t border-black/[0.06] px-6 py-3 text-center">
          <p className="text-[11px] uppercase tracking-wider text-muted">
            Recorded {formatDate(batch.entryDate)} · CAFS DryChain
          </p>
        </div>
      </div>
    </>
  );
}
