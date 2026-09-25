"use client";

import { titleCase, formatDate } from "@/lib/utils";
import { useState } from "react";
import type { Batch } from "@/lib/types";
import { stageLabelFor } from "@/lib/lifecycle";
import Button from "@/components/ui/Button";
import { FileIcon, CheckIcon } from "@/components/icons";
import { jsPDF } from "jspdf";

/** Marks a cell with nothing recorded. */
const DASH = "\u2014";

export default function ReportActions({ batches }: { batches: Batch[] }) {
  const [donePdf, setDonePdf] = useState(false);

  const exportPdf = () => {
    // Landscape: the ledger carries category and entry date now, which will not
    // fit legibly across a portrait page.
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const LEFT = 15;
    const RIGHT = 282;

    const totalFresh = batches.reduce((s, b) => s + b.freshWeight, 0);
    // Only finished batches have a dried weight, so this covers fewer batches
    // than intake. The label says so rather than implying a yield figure.
    const dried = batches.filter((b) => b.finalWeight !== undefined);
    const totalDried = dried.reduce((s, b) => s + (b.finalWeight ?? 0), 0);
    const moistureVals = batches
      .map((b) => b.moisture)
      .filter((m): m is number => m !== undefined);
    const avgMoisture = moistureVals.length
      ? moistureVals.reduce((s, m) => s + m, 0) / moistureVals.length
      : 0;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(14, 58, 23);
    doc.text("CAFS DRYING NETWORK", LEFT, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(91, 107, 96);
    doc.text("ON CHAIN TRACEABILITY & YIELD REPORT", LEFT, 26);
    doc.text(
      `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      RIGHT,
      26,
      { align: "right" }
    );

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.4);
    doc.line(LEFT, 30, RIGHT, 30);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(14, 58, 23);
    doc.text("Summary", LEFT, 39);

    const summary: [string, string, string][] = [
      ["Batches registered", String(batches.length), "across all hubs"],
      ["Fresh weight in", `${totalFresh.toLocaleString()} kg`, `from ${batches.length} batches`],
      ["Dried weight out", `${totalDried.toLocaleString()} kg`, `from ${dried.length} finished`],
      ["Average moisture", `${avgMoisture.toFixed(1)}%`, `${moistureVals.length} readings`],
    ];
    summary.forEach(([label, value, hint], i) => {
      const x = LEFT + i * 62;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(91, 107, 96);
      doc.text(label, x, 46);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(14, 58, 23);
      doc.text(value, x, 54);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(140, 150, 143);
      doc.text(hint, x, 59);
    });

    doc.setDrawColor(220, 220, 220);
    doc.line(LEFT, 64, RIGHT, 64);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(14, 58, 23);
    doc.text("Batch ledger", LEFT, 73);

    // Column widths drive the header and every row, so the two cannot drift.
    const cols: { label: string; w: number; value: (b: Batch) => string }[] = [
      { label: "Batch ID", w: 32, value: (b) => b.id },
      { label: "Category", w: 30, value: (b) => titleCase(b.category) ?? DASH },
      { label: "Product", w: 32, value: (b) => titleCase(b.product) ?? DASH },
      { label: "Hub", w: 30, value: (b) => titleCase(b.location) ?? DASH },
      { label: "Entered", w: 24, value: (b) => formatDate(b.entryDate) },
      { label: "Fresh", w: 19, value: (b) => `${b.freshWeight} kg` },
      { label: "Dried", w: 19, value: (b) => (b.finalWeight !== undefined ? `${b.finalWeight} kg` : DASH) },
      { label: "Moisture", w: 19, value: (b) => (b.moisture !== undefined ? `${b.moisture}%` : DASH) },
      { label: "Drying method", w: 28, value: (b) => titleCase(b.dryingMethod) ?? DASH },
      { label: "Stage", w: 30, value: (b) => stageLabelFor(b) },
    ];
    const xs = cols.reduce<number[]>((acc, _col, i) => {
      acc.push(i === 0 ? LEFT + 2 : acc[i - 1] + cols[i - 1].w);
      return acc;
    }, []);
    const tableWidth = cols.reduce((sum, c) => sum + c.w, 0);

    const drawHead = (top: number) => {
      doc.setFillColor(238, 248, 233);
      doc.rect(LEFT, top, tableWidth, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(14, 58, 23);
      cols.forEach((c, i) => doc.text(c.label, xs[i], top + 6));
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      return top + 8;
    };

    const trunc = (str: string, mm: number) => {
      const max = Math.floor(mm / 1.6);
      return str.length > max ? str.slice(0, max - 2) + ".." : str;
    };

    let y = drawHead(79);

    batches.forEach((b, index) => {
      if (y > 185) {
        doc.addPage();
        y = drawHead(20);
      }
      if (index % 2 === 1) {
        doc.setFillColor(250, 252, 249);
        doc.rect(LEFT, y, tableWidth, 7, "F");
      }
      cols.forEach((c, i) => doc.text(trunc(c.value(b), c.w), xs[i], y + 5));
      doc.setDrawColor(240, 240, 240);
      doc.line(LEFT, y + 7, LEFT + tableWidth, y + 7);
      y += 7;
    });

    y += 10;
    if (y > 190) {
      doc.addPage();
      y = 20;
    }
    doc.setDrawColor(71, 168, 29);
    doc.setLineWidth(0.6);
    doc.line(LEFT, y, RIGHT, y);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(91, 107, 96);
    doc.text("CAFS DryChain platform. Blockchain verified product traceability report.", LEFT, y + 6);
    doc.text("Secured on the blockchain.", RIGHT, y + 6, { align: "right" });

    doc.save(`drychain-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    setDonePdf(true);
    setTimeout(() => setDonePdf(false), 3000);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Button variant="dark" onClick={exportPdf} disabled={batches.length === 0}>
        <FileIcon className="h-5 w-5" /> Download report ({batches.length})
      </Button>
      {donePdf && (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand animate-in fade-in duration-200">
          <CheckIcon className="h-4 w-4" /> PDF downloaded
        </span>
      )}
    </div>
  );
}
