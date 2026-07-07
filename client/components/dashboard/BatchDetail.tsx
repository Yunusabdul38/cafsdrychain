import Link from "next/link";
import type { Batch } from "@/lib/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { StageBadge, VerifiedBadge } from "@/components/ui/Badge";
import PageHeader from "@/components/dashboard/PageHeader";
import StageProgress from "@/components/dashboard/StageProgress";
import Timeline from "@/components/dashboard/Timeline";
import { LinkButton } from "@/components/ui/Button";
import { nextAction } from "@/lib/lifecycle";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ArrowRightIcon, QrIcon } from "@/components/icons";

function Row({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right font-medium text-brand-dark">
        {value ?? "—"}
      </dd>
    </div>
  );
}

export default function BatchDetail({
  batch,
  basePath,
  canAct = false,
}: {
  batch: Batch;
  basePath: string;
  canAct?: boolean;
}) {
  const action = nextAction(batch.stage);

  return (
    <>
      <PageHeader
        title={batch.product}
        back={{ href: basePath, label: "Batches" }}
        action={
          canAct && action ? (
            <LinkButton href={`${basePath}/${batch.id}/update`}>
              {action.label} <ArrowRightIcon className="h-5 w-5" />
            </LinkButton>
          ) : undefined
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-muted">{batch.id}</span>
        <StageBadge stage={batch.stage} />
        {batch.verified && <VerifiedBadge />}
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
              <Row label="Product" value={batch.product} />
              <Row label="Source" value={`${batch.source} (${batch.sourceType})`} />
              <Row label="Supplier" value={batch.supplier} />
              <Row label="Fresh weight" value={`${batch.freshWeight} kg`} />
              <Row label="Delivery date" value={formatDate(batch.deliveryDate)} />
              <Row label="Facility" value={batch.location} />
              <Row label="Operator" value={batch.operator} />
            </dl>
          </Card>

          <Card>
            <CardHeader title="Drying record" />
            <dl className="divide-y divide-black/[0.06]">
              <Row
                label="Started"
                value={batch.dryingStart ? formatDateTime(batch.dryingStart) : undefined}
              />
              <Row
                label="Completed"
                value={batch.dryingEnd ? formatDateTime(batch.dryingEnd) : undefined}
              />
              <Row
                label="Final weight"
                value={batch.finalWeight ? `${batch.finalWeight} kg` : undefined}
              />
              <Row
                label="Moisture"
                value={batch.moisture !== undefined ? `${batch.moisture}%` : undefined}
              />
              <Row label="Quality" value={batch.quality} />
            </dl>
          </Card>

          <Card>
            <CardHeader title="Storage & distribution" />
            <dl className="divide-y divide-black/[0.06]">
              <Row label="Storage location" value={batch.storageLocation} />
              <Row label="Packaging" value={batch.packaging} />
              <Row label="Transport" value={batch.transport} />
              <Row label="Destination" value={batch.destination} />
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          {/* QR / verification */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                  Public verification
                </p>
                <p className="mt-1 font-mono text-sm text-brand-dark">
                  {batch.id}
                </p>
              </div>
              <VerifiedBadge />
            </div>
            <div className="mt-4 flex items-center justify-center rounded-2xl border border-black/[0.08] bg-mint py-8">
              <QrIcon className="h-24 w-24 text-brand-dark" />
            </div>
            <Link
              href={`/verify/${batch.id}`}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-black/[0.12] text-sm font-semibold text-brand-dark transition-colors hover:bg-mint"
            >
              Open public record <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader title="On-chain timeline" />
            <div className="p-5">
              <Timeline events={batch.timeline} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
