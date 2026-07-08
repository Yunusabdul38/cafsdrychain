"use client";

import { useState } from "react";
import type { Batch } from "@/lib/types";
import { STAGE_LABEL } from "@/lib/mock-data";
import Button from "@/components/ui/Button";
import { DownloadIcon, FileIcon, CheckIcon } from "@/components/icons";
import { jsPDF } from "jspdf";

function csvEscape(v: string | number | undefined | null): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ReportActions({ batches }: { batches: Batch[] }) {
  const [doneCsv, setDoneCsv] = useState(false);
  const [donePdf, setDonePdf] = useState(false);

  const exportCsv = () => {
    const headers = [
      "Batch ID", "Product", "Source", "Type", "Supplier", "Fresh (kg)",
      "Final (kg)", "Moisture %", "Stage", "Location", "Destination", "Verified", "Tx",
    ];
    const rows = batches.map((b) => [
      b.id, b.product, b.source, b.sourceType, b.supplier, b.freshWeight,
      b.finalWeight ?? "", b.moisture ?? "", STAGE_LABEL[b.stage], b.location,
      b.destination ?? "", b.verified ? "yes" : "no", b.txHash ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drychain-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDoneCsv(true);
    setTimeout(() => setDoneCsv(false), 3000);
  };

  const exportPdf = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const totalFresh = batches.reduce((s, b) => s + b.freshWeight, 0);
    const totalDried = batches.reduce((s, b) => s + (b.finalWeight ?? 0), 0);
    const moistureVals = batches.map((b) => b.moisture).filter((m): m is number => m !== undefined);
    const avgMoisture = moistureVals.length
      ? Math.round(moistureVals.reduce((s, m) => s + m, 0) / moistureVals.length)
      : 0;

    // Header Branding
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(14, 58, 23); // #0e3a17 Deep forest green
    doc.text("CAFS DRYING NETWORK", 20, 25);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(91, 107, 96); // #5b6b60 Muted green
    doc.text("ON-CHAIN TRACEABILITY & YIELD REPORT", 20, 31);
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 130, 31);

    // Separator Line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.4);
    doc.line(20, 36, 190, 36);

    // Stats Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(14, 58, 23);
    doc.text("Summary Metrics", 20, 46);

    // Summary Metric Labels
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(91, 107, 96);
    doc.text("Total Batches", 20, 54);
    doc.text("Fresh Intake", 60, 54);
    doc.text("Dried Output", 100, 54);
    doc.text("Avg Moisture", 140, 54);

    // Summary Metric Values
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(14, 58, 23);
    doc.text(`${batches.length}`, 20, 62);
    doc.text(`${(totalFresh / 1000).toFixed(2)} t`, 60, 62);
    doc.text(`${(totalDried / 1000).toFixed(2)} t`, 100, 62);
    doc.text(`${avgMoisture}%`, 140, 62);

    // Divider Line
    doc.setDrawColor(220, 220, 220);
    doc.line(20, 68, 190, 68);

    // Table Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(14, 58, 23);
    doc.text("Batch Detailed Ledger", 20, 78);

    let y = 84;
    // Mint green table header background
    doc.setFillColor(238, 248, 233); // #eef8e9
    doc.rect(20, y, 170, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(14, 58, 23);
    doc.text("Batch ID", 22, y + 6);
    doc.text("Product", 52, y + 6);
    doc.text("Facility", 92, y + 6);
    doc.text("Fresh", 127, y + 6);
    doc.text("Final", 147, y + 6);
    doc.text("Moisture", 162, y + 6);
    doc.text("Stage", 177, y + 6);

    y += 8;

    // Table rows data
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);

    batches.forEach((b, index) => {
      // Add page if height exceeded
      if (y > 270) {
        doc.addPage();
        y = 20;

        // Redraw headers
        doc.setFillColor(238, 248, 233);
        doc.rect(20, y, 170, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(14, 58, 23);
        doc.text("Batch ID", 22, y + 6);
        doc.text("Product", 52, y + 6);
        doc.text("Facility", 92, y + 6);
        doc.text("Fresh", 127, y + 6);
        doc.text("Final", 147, y + 6);
        doc.text("Moisture", 162, y + 6);
        doc.text("Stage", 177, y + 6);
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
      }

      // Zebra stripes background
      if (index % 2 === 1) {
        doc.setFillColor(250, 252, 249);
        doc.rect(20, y, 170, 7, "F");
      }

      const trunc = (str: string, maxLen: number) =>
        str.length > maxLen ? str.slice(0, maxLen - 2) + ".." : str;

      doc.text(b.id, 22, y + 5);
      doc.text(trunc(b.product, 20), 52, y + 5);
      doc.text(trunc(b.location, 18), 92, y + 5);
      doc.text(`${b.freshWeight} kg`, 127, y + 5);
      doc.text(b.finalWeight !== undefined ? `${b.finalWeight} kg` : "—", 147, y + 5);
      doc.text(b.moisture !== undefined ? `${b.moisture}%` : "—", 162, y + 5);
      doc.text(STAGE_LABEL[b.stage] ?? b.stage, 177, y + 5);

      // Subtle row border line
      doc.setDrawColor(240, 240, 240);
      doc.line(20, y + 7, 190, y + 7);
      y += 7;
    });

    // Signature/Footer block
    y += 10;
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.setDrawColor(71, 168, 29); // brand green line #47a81d
    doc.setLineWidth(0.6);
    doc.line(20, y, 190, y);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(91, 107, 96);
    doc.text("CAFS DryChain platform. Blockchain-verified product traceability report.", 20, y + 6);
    doc.text("Secured on Base network.", 152, y + 6);

    doc.save(`drychain-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    setDonePdf(true);
    setTimeout(() => setDonePdf(false), 3000);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Button variant="dark" onClick={exportPdf} disabled={batches.length === 0}>
        <FileIcon className="h-5 w-5" /> Export Premium PDF ({batches.length})
      </Button>
      <Button variant="outline" onClick={exportCsv} disabled={batches.length === 0}>
        <DownloadIcon className="h-5 w-5" /> Export CSV ({batches.length})
      </Button>
      {donePdf && (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand animate-in fade-in duration-200">
          <CheckIcon className="h-4 w-4" /> PDF downloaded
        </span>
      )}
      {doneCsv && (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand animate-in fade-in duration-200">
          <CheckIcon className="h-4 w-4" /> CSV downloaded
        </span>
      )}
    </div>
  );
}
