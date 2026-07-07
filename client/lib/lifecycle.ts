import type { BatchStage } from "./types";

export type NextAction = {
  /** CTA label shown on buttons */
  label: string;
  /** short heading for the update form */
  heading: string;
  /** the stage the batch moves into */
  next: BatchStage;
};

export const nextActionByStage: Record<BatchStage, NextAction | null> = {
  registered: {
    label: "Start drying",
    heading: "Start drying process",
    next: "drying",
  },
  drying: {
    label: "Complete drying",
    heading: "Complete drying process",
    next: "dried",
  },
  dried: {
    label: "Record storage",
    heading: "Record storage details",
    next: "stored",
  },
  stored: {
    label: "Record distribution",
    heading: "Record distribution details",
    next: "in-transit",
  },
  "in-transit": {
    label: "Confirm delivery",
    heading: "Confirm delivery",
    next: "delivered",
  },
  delivered: null,
};

export function nextAction(stage: BatchStage) {
  return nextActionByStage[stage];
}
