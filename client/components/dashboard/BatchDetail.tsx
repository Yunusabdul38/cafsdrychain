import DetailRow from "@/components/ui/DetailRow";
import BatchQr from "@/components/dashboard/BatchQr";
import Link from "next/link";
import type { Batch } from "@/lib/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { StageBadge, VerifiedBadge } from "@/components/ui/Badge";
import PageHeader from "@/components/dashboard/PageHeader";
import StageProgress from "@/components/dashboard/StageProgress";
import Timeline from "@/components/dashboard/Timeline";
import Button, { LinkButton, buttonClass } from "@/components/ui/Button";
import { useReconcileChain } from "@/lib/hooks/useBatches";
import { actionForBatch } from "@/lib/lifecycle";
import { formatDate, formatDateTime, titleCase } from "@/lib/utils";
import { ArrowRightIcon } from "@/components/icons";

export default function BatchDetail({
  batch,
  basePath,
  canAct = false,
}: {
  batch: Batch;
  basePath: string;
  canAct?: boolean;
}) {
  const action = actionForBatch(batch);
  const reconcile = useReconcileChain(batch.id);
  // PENDING is a write still settling; FAILED is one that did not land and will
  // not retry itself until the sweep comes round. Only the latter is worth
  // putting in front of someone.
  const chainBehind = batch.chainStatus === "FAILED";


  return (
    <>
      <PageHeader
        title={titleCase(batch.product)}
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
        <StageBadge stage={batch.stage} paid={batch.payment?.status === "PAID"} />
        {batch.verified && <VerifiedBadge />}
      </div>

      {chainBehind && (
        <Card className="mb-6 border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-900">
            This batch is not fully recorded on the blockchain
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-800">
            The details above are saved, but a blockchain write did not go
            through — so this batch cannot be publicly verified yet. Nothing is
            lost: retrying writes only the steps the chain is missing.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="dark"
              disabled={reconcile.isPending}
              onClick={() => reconcile.mutate()}
            >
              {reconcile.isPending ? "Writing to blockchain…" : "Retry now"}
            </Button>
            {reconcile.isError && (
              <span className="text-xs font-medium text-red-700">
                Still could not write. It will be retried automatically.
              </span>
            )}
            {reconcile.isSuccess && (
              <span className="text-xs font-medium text-brand">Recorded.</span>
            )}
          </div>
        </Card>
      )}

      {/* Progress */}
      <Card className="mb-6 p-5">
        <StageProgress stage={batch.stage} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Produce" />
            <dl className="divide-y divide-black/[0.06]">
              <DetailRow label="Category" value={batch.category} />
              <DetailRow label="Product" value={titleCase(batch.product)} />
              <DetailRow label="Source" value={`${titleCase(batch.source)} (${batch.sourceType})`} />
              <DetailRow label="Fresh weight" value={`${batch.freshWeight} kg`} />
              <DetailRow label="Entry date" value={formatDate(batch.entryDate)} />
              <DetailRow label="Facility" value={titleCase(batch.location)} />
              <DetailRow label="Operator" value={titleCase(batch.operator)} />
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
          {/* QR / verification */}
          <Card className="p-5">
            {batch.verified && (
              <div className="flex justify-end">
                <VerifiedBadge />
              </div>
            )}
            <BatchQr
              label={{
                  batchId: batch.id,
                  product: batch.product,
                  location: batch.location,
                  freshWeight: batch.freshWeight,
                  entryDate: batch.entryDate,
                }}
              className="mt-4"
            />
            <Link
              href={`/verify/${batch.id}`}
              target="_blank"
              className={buttonClass({ variant: "outline", full: true, className: "mt-4" })}
            >
              Open public record <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader title="On chain timeline" />
            <div className="p-5">
              <Timeline events={batch.timeline} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
