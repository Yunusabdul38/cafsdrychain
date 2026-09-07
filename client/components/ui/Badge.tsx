import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { BatchStage } from "@/lib/types";
import { stageLabelFor } from "@/lib/lifecycle";

export function Badge({
  children,
  className,
  dot,
}: {
  children: ReactNode;
  className?: string;
  dot?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />}
      {children}
    </span>
  );
}

const stageStyles: Record<BatchStage, string> = {
  registered: "bg-sky-soft text-sky",
  drying: "bg-[#FFF3E0] text-[#B4740B]",
  dried: "bg-mint text-brand",
  stored: "bg-[#EEF0FF] text-[#4457C7]",
  "in-transit": "bg-[#FDEEE4] text-[#C4622A]",
  "awaiting-payment": "bg-[#FFF3E0] text-[#B4740B]",
  delivered: "bg-brand-dark text-white",
};

export function StageBadge({
  stage,
  paid,
}: {
  stage: BatchStage;
  /** A paid batch waits at the payment stage until drying starts — say so. */
  paid?: boolean;
}) {
  const settled = stage === "awaiting-payment" && paid;
  return (
    <Badge className={settled ? "bg-mint text-brand" : stageStyles[stage]}>
      {stageLabelFor({ stage, payment: paid ? { status: "PAID" } : undefined })}
    </Badge>
  );
}

export function VerifiedBadge() {
  return (
    <Badge className="bg-mint text-brand" dot="bg-brand">
      On chain
    </Badge>
  );
}
