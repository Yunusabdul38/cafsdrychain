import Link from "next/link";
import type { Batch } from "@/lib/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { StageBadge } from "@/components/ui/Badge";
import StageProgress from "@/components/dashboard/StageProgress";
import Timeline from "@/components/dashboard/Timeline";
import { formatDate } from "@/lib/utils";
import { ChevronLeftIcon, CheckIcon, QrIcon } from "@/components/icons";

function Row({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right font-medium text-brand-dark">{value ?? "—"}</dd>
    </div>
  );
}

export default function PublicRecord({
  batch,
  onChainValid,
}: {
  batch: Batch;
  onChainValid?: boolean;
}) {
  const verified = batch.verified || onChainValid;
  return (
    <div>
      <Link
        href="/verify"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-brand-dark"
      >
        <ChevronLeftIcon className="h-4 w-4" /> Verify another
      </Link>

      {/* Verification banner — reflects real chain status */}
      <div
        className={
          verified
            ? "flex items-center gap-4 rounded-2xl border border-brand/30 bg-mint/60 p-5"
            : "flex items-center gap-4 rounded-2xl border border-[#B4740B]/30 bg-[#FFF3E0] p-5"
        }
      >
        <span
          className={
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white " +
            (verified ? "bg-brand" : "bg-[#B4740B]")
          }
        >
          <CheckIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-brand-dark">
            {verified ? "Authentic & verified" : "Recorded — pending confirmation"}
          </p>
          <p className="text-sm text-muted">
            {verified
              ? "This product's history is secured on the Base blockchain."
              : "This record exists and is awaiting on-chain confirmation."}
          </p>
        </div>
      </div>

      {/* Summary */}
      <Card className="mt-5 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-brand-dark">
                {batch.product}
              </h1>
              <StageBadge stage={batch.stage} />
            </div>
            <p className="mt-1 font-mono text-sm text-muted">{batch.id}</p>
            <p className="mt-1 text-sm text-muted">
              {batch.source} ({batch.sourceType}) · {batch.location}
            </p>
          </div>
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-black/[0.08] bg-mint">
            <QrIcon className="h-16 w-16 text-brand-dark" />
          </div>
        </div>
        <div className="mt-6">
          <StageProgress stage={batch.stage} />
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Product details" />
          <dl className="divide-y divide-black/[0.06]">
            <Row label="Product" value={batch.product} />
            <Row label="Source" value={`${batch.source} (${batch.sourceType})`} />
            <Row label="Supplier" value={batch.supplier} />
            <Row label="Fresh weight" value={`${batch.freshWeight} kg`} />
            <Row label="Delivered" value={formatDate(batch.deliveryDate)} />
            <Row
              label="Final weight"
              value={batch.finalWeight ? `${batch.finalWeight} kg` : undefined}
            />
            <Row
              label="Moisture"
              value={batch.moisture !== undefined ? `${batch.moisture}%` : undefined}
            />
            <Row label="Quality" value={batch.quality} />
            <Row label="Destination" value={batch.destination} />
          </dl>
        </Card>

        <Card>
          <CardHeader title="Traceability timeline" />
          <div className="p-5">
            <Timeline events={batch.timeline} />
          </div>
        </Card>
      </div>
    </div>
  );
}
