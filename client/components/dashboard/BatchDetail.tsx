import DetailRow from "@/components/ui/DetailRow";
import Link from "next/link";
import type { Batch } from "@/lib/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { StageBadge, VerifiedBadge } from "@/components/ui/Badge";
import PageHeader from "@/components/dashboard/PageHeader";
import StageProgress from "@/components/dashboard/StageProgress";
import Timeline from "@/components/dashboard/Timeline";
import { LinkButton, buttonClass } from "@/components/ui/Button";
import { nextAction } from "@/lib/lifecycle";
import { formatDate, formatDateTime, titleCase } from "@/lib/utils";
import { ArrowRightIcon, DownloadIcon } from "@/components/icons";

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

  const handleDownloadQr = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 700;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Premium mint border
    ctx.strokeStyle = "#eef7ed";
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

    // Accent header
    ctx.fillStyle = "#113824"; // brand dark green
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CAFS DRYING NETWORK", canvas.width / 2, 70);

    ctx.fillStyle = "#5c7d6d"; // muted green
    ctx.font = "16px sans-serif";
    ctx.fillText("ON-CHAIN TRACEABLE BATCH", canvas.width / 2, 100);

    // Divider line
    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 125);
    ctx.lineTo(canvas.width - 40, 125);
    ctx.stroke();

    // Batch Details
    ctx.textAlign = "left";
    ctx.fillStyle = "#113824";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("PRODUCT:", 60, 170);
    ctx.font = "16px sans-serif";
    ctx.fillText(batch.product, 200, 170);

    ctx.font = "bold 16px sans-serif";
    ctx.fillText("FACILITY:", 60, 205);
    ctx.font = "16px sans-serif";
    ctx.fillText(batch.location, 200, 205);

    ctx.font = "bold 16px sans-serif";
    ctx.fillText("FRESH WEIGHT:", 60, 240);
    ctx.font = "16px sans-serif";
    ctx.fillText(`${batch.freshWeight} kg`, 200, 240);

    ctx.font = "bold 16px sans-serif";
    ctx.fillText("ENTRY DATE:", 60, 275);
    ctx.font = "16px sans-serif";
    ctx.fillText(formatDate(batch.entryDate), 200, 275);

    // QR Code Image
    const qrImage = new Image();
    qrImage.crossOrigin = "anonymous";
    const qrData = `${window.location.origin}/verify/${batch.id}`;
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

    qrImage.onload = () => {
      // Center of canvas: x = (600 - 260) / 2 = 170
      ctx.drawImage(qrImage, 170, 320, 260, 260);

      // QR Frame
      ctx.strokeStyle = "#113824";
      ctx.lineWidth = 4;
      ctx.strokeRect(165, 315, 270, 270);

      // Batch ID Text below QR
      ctx.textAlign = "center";
      ctx.fillStyle = "#113824";
      ctx.font = "bold 20px monospace";
      ctx.fillText(batch.id, canvas.width / 2, 630);

      // Footer
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#a0aec0";
      ctx.fillText("Scan QR to verify origin and drying history on the blockchain.", canvas.width / 2, 665);

      // Trigger download
      const link = document.createElement("a");
      link.download = `QR-${batch.id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  };

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
            <div className="relative mt-4 flex flex-col items-center justify-center rounded-2xl border border-black/[0.08] bg-mint p-6">
              <button
                type="button"
                onClick={handleDownloadQr}
                aria-label="Download QR code"
                title="Download QR code"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.08] bg-white text-brand transition-colors hover:bg-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <DownloadIcon className="h-4 w-4" />
              </button>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(`${window.location.origin}/verify/${batch.id}`)}`}
                alt={`QR code for ${batch.id}`}
                className="h-40 w-40 rounded-xl bg-white p-2 sm:h-48 sm:w-48"
              />
            </div>
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
