import { formatDate } from "@/lib/utils";

export type BatchLabel = {
  batchId: string;
  product: string;
  location: string;
  freshWeight: number;
  entryDate: string;
};

/** The public page a batch's QR code opens. */
export const verifyUrl = (batchId: string) =>
  `${window.location.origin}/verify/${batchId}`;

/**
 * Draw a printable label for a batch and download it as a PNG.
 *
 * `qr` is a QR code the page has already rendered (qrcode.react's canvas), so
 * this is synchronous and needs no network: it used to fetch the image from a
 * third-party generator, and when that did not answer, the download button
 * silently did nothing.
 */
export function downloadBatchLabel(qr: HTMLCanvasElement, label: BatchLabel) {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 700;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Mint border
  ctx.strokeStyle = "#eef7ed";
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

  // Header
  ctx.fillStyle = "#113824";
  ctx.font = "bold 26px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CAFS DRYING NETWORK", canvas.width / 2, 70);

  ctx.fillStyle = "#5c7d6d";
  ctx.font = "16px sans-serif";
  ctx.fillText("ON-CHAIN TRACEABLE BATCH", canvas.width / 2, 100);

  ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 125);
  ctx.lineTo(canvas.width - 40, 125);
  ctx.stroke();

  // Details
  const rows: [string, string][] = [
    ["PRODUCT:", label.product],
    ["FACILITY:", label.location],
    ["FRESH WEIGHT:", `${label.freshWeight} kg`],
    ["ENTRY DATE:", formatDate(label.entryDate)],
  ];
  ctx.textAlign = "left";
  ctx.fillStyle = "#113824";
  rows.forEach(([name, value], i) => {
    const y = 170 + i * 35;
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(name, 60, y);
    ctx.font = "16px sans-serif";
    ctx.fillText(value, 200, y);
  });

  // QR, centred: (600 - 260) / 2 = 170
  ctx.drawImage(qr, 170, 320, 260, 260);
  ctx.strokeStyle = "#113824";
  ctx.lineWidth = 4;
  ctx.strokeRect(165, 315, 270, 270);

  ctx.textAlign = "center";
  ctx.fillStyle = "#113824";
  ctx.font = "bold 20px monospace";
  ctx.fillText(label.batchId, canvas.width / 2, 630);

  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#a0aec0";
  ctx.fillText(
    "Scan QR to verify origin and drying history on the blockchain.",
    canvas.width / 2,
    665
  );

  const link = document.createElement("a");
  link.download = `QR-${label.batchId}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
