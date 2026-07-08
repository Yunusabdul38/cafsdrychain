import type { Batch, BatchStage, TimelineEvent } from "./types";
import type { ApiBatch, ApiStage } from "./hooks/useBatches";

const STAGE_MAP: Record<ApiStage, BatchStage> = {
  REGISTERED: "registered",
  DRYING: "drying",
  DRIED: "dried",
  STORED: "stored",
  IN_TRANSIT: "in-transit",
  DELIVERED: "delivered",
};

export function apiStage(s: ApiStage): BatchStage {
  return STAGE_MAP[s] ?? "registered";
}

/** Map an API batch to the shape the existing UI components consume. */
export function toUiBatch(b: ApiBatch): Batch {
  return {
    id: b.batchId,
    product: b.product,
    sourceType: b.sourceType,
    source: b.source,
    supplier: b.supplier,
    freshWeight: b.freshWeight,
    finalWeight: b.finalWeight ?? undefined,
    moisture: b.moisture ?? undefined,
    deliveryDate: b.deliveryDate,
    dryingStart: b.dryingStart ?? undefined,
    dryingEnd: b.dryingEnd ?? undefined,
    quality: b.quality ?? undefined,
    storageLocation: b.storageLocation ?? undefined,
    packaging: b.packaging ?? undefined,
    transport: b.transport ?? undefined,
    destination: b.destination ?? undefined,
    stage: apiStage(b.stage),
    operator: b.operator?.name ?? "—",
    location: b.location,
    verified: b.chainStatus === "CONFIRMED",
    txHash: b.txHash ?? "",
    timeline: (b.events ?? []).map(
      (e): TimelineEvent => ({
        stage: apiStage(e.stage),
        title: e.title,
        actor: e.actor,
        timestamp: e.createdAt,
        txHash: e.txHash ?? "",
      })
    ),
  };
}

export function toUiBatches(list: ApiBatch[]): Batch[] {
  return list.map(toUiBatch);
}

import type { LedgerRecord } from "@/components/dashboard/ChainLedger";
import type { PublicRecord } from "./hooks/useVerify";

/** Map the public verify API record to the UI Batch shape. */
export function publicToUiBatch(r: PublicRecord): Batch {
  return {
    id: r.batchId,
    product: r.product,
    sourceType: (r.sourceType as "Farm" | "Market") ?? "Farm",
    source: r.source,
    supplier: r.supplier,
    freshWeight: r.freshWeight,
    finalWeight: r.finalWeight ?? undefined,
    moisture: r.moisture ?? undefined,
    deliveryDate: r.deliveryDate,
    quality: r.quality ?? undefined,
    storageLocation: r.storageLocation ?? undefined,
    destination: r.destination ?? undefined,
    stage: apiStage(r.stage as ApiStage),
    operator: "—",
    location: r.location,
    verified: r.verified,
    txHash: r.txHash ?? "",
    timeline: r.timeline.map((e) => ({
      stage: apiStage(e.stage as ApiStage),
      title: e.title,
      actor: e.actor,
      timestamp: e.timestamp,
      txHash: e.txHash ?? "",
    })),
  };
}

function ledgerStatus(chainStatus?: string, txHash?: string | null): LedgerRecord["status"] {
  if (chainStatus === "CONFIRMED" || (!chainStatus && txHash)) return "confirmed";
  if (chainStatus === "FAILED") return "failed";
  return "pending";
}

/** Flatten every batch's on-chain events into a ledger, newest first. */
export function buildLedger(list: ApiBatch[]): LedgerRecord[] {
  return list
    .flatMap((b) =>
      (b.events ?? []).map((e, i) => ({
        id: `${b.batchId}-${i}-${e.createdAt}`,
        txHash: e.txHash ?? "",
        batchId: b.batchId,
        action: e.title,
        actor: e.actor,
        timestamp: e.createdAt,
        status: ledgerStatus(e.chainStatus, e.txHash),
        location: b.location,
      }))
    )
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}
