import type { BatchStage } from "./types";

/**
 * How each stage is written on screen. Covers every stage a batch can hold,
 * including `in-transit`, which is retired but still present on older records.
 */
export const STAGE_LABEL: Record<BatchStage, string> = {
  registered: "Registered",
  "awaiting-payment": "Payment",
  drying: "Drying",
  dried: "Dried",
  stored: "Stored",
  "in-transit": "In transit",
  delivered: "Delivered",
};

/** The forward path a batch takes, and the order the progress bar renders. */
export const STAGE_ORDER: BatchStage[] = [
  "registered",
  "awaiting-payment",
  "drying",
  "dried",
  "stored",
  "delivered",
];
