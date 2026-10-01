import type { BatchStage } from "./types";

/** How each stage is written on screen. */
export const STAGE_LABEL: Record<BatchStage, string> = {
  registered: "Registered",
  "awaiting-payment": "Payment",
  drying: "Drying",
  dried: "Dried",
  delivered: "Delivered",
};

/** The forward path a batch takes, and the order the progress bar renders. */
export const STAGE_ORDER: BatchStage[] = [
  "registered",
  "awaiting-payment",
  "drying",
  "dried",
  "delivered",
];
