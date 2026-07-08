"use client";

import { useState } from "react";
import type { Batch } from "@/lib/types";
import { STAGE_LABEL } from "@/lib/mock-data";
import Button from "@/components/ui/Button";
import { DownloadIcon, FileIcon, CheckIcon } from "@/components/icons";

function csvEscape(v: string | number | undefined | null): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ReportActions({ batches }: { batches: Batch[] }) {
  const [done, setDone] = useState(false);

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
    setDone(true);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Button variant="dark" onClick={() => window.print()}>
        <FileIcon className="h-5 w-5" /> Print / Save as PDF
      </Button>
      <Button variant="outline" onClick={exportCsv} disabled={batches.length === 0}>
        <DownloadIcon className="h-5 w-5" /> Export CSV ({batches.length})
      </Button>
      {done && (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
          <CheckIcon className="h-4 w-4" /> CSV downloaded
        </span>
      )}
    </div>
  );
}
