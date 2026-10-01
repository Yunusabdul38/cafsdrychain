"use client";

import { useRef } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { DownloadIcon } from "@/components/icons";
import { downloadBatchLabel, verifyUrl, type BatchLabel } from "@/lib/batchLabel";
import { cn } from "@/lib/utils";

/**
 * A batch's QR code, linking to its public verify page, with a button that
 * downloads it as a printable label.
 *
 * Both codes are drawn here in the browser. They used to be fetched from a
 * third-party generator, which received every batch URL and left the box blank
 * — and the download silently dead — whenever it did not answer.
 */
export default function BatchQr({ label, className }: { label: BatchLabel; className?: string }) {
  // The label is painted on a canvas, so it needs the QR as pixels, not SVG.
  // Drawn at twice the printed size so it stays sharp when scaled down.
  const qrPixels = useRef<HTMLCanvasElement>(null);
  const url = verifyUrl(label.batchId);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border border-black/[0.08] bg-mint p-6",
        className
      )}
    >
      <button
        type="button"
        onClick={() => qrPixels.current && downloadBatchLabel(qrPixels.current, label)}
        aria-label="Download QR code"
        title="Download QR code"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.08] bg-white text-brand transition-colors hover:bg-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <DownloadIcon className="h-4 w-4" />
      </button>
      <QRCodeSVG
        value={url}
        size={192}
        level="M"
        marginSize={0}
        role="img"
        aria-label={`QR code for ${label.batchId}`}
        className="h-40 w-40 rounded-xl bg-white p-2 sm:h-48 sm:w-48"
      />
      <QRCodeCanvas ref={qrPixels} value={url} size={520} level="M" marginSize={3} hidden />
    </div>
  );
}
