"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { DownloadIcon, FileIcon, CheckIcon } from "@/components/icons";

export default function ReportActions() {
  const [state, setState] = useState<"idle" | "working" | "done">("idle");

  const run = () => {
    setState("working");
    setTimeout(() => setState("done"), 1200);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Button variant="dark" onClick={run} disabled={state === "working"}>
        <FileIcon className="h-5 w-5" />
        {state === "working" ? "Generating…" : "Generate PDF report"}
      </Button>
      <Button variant="outline" onClick={run} disabled={state === "working"}>
        <DownloadIcon className="h-5 w-5" /> Export CSV
      </Button>
      {state === "done" && (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
          <CheckIcon className="h-4 w-4" /> Report ready — download started
        </span>
      )}
    </div>
  );
}
