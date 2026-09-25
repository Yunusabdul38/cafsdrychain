import type { BatchStage } from "./types";
import { STAGE_LABEL } from "./stages";

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
    label: "Set drying fee",
    heading: "Set the drying fee",
    next: "awaiting-payment",
  },
  "awaiting-payment": {
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
    label: "Record delivery",
    heading: "Record delivery details",
    next: "delivered",
  },
  // Legacy: no new batch reaches this stage, but one already there must still
  // be completable.
  stored: {
    label: "Record delivery",
    heading: "Record delivery details",
    next: "delivered",
  },
  // Legacy: no new batch reaches this stage, but any batch already sitting in
  // it must still be completable.
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

/**
 * The action to offer for a given batch, which is not always the one its stage
 * implies.
 *
 * A batch sitting at `awaiting-payment` with the fee unpaid cannot start
 * drying, and the form it opens is the payment screen, not a drying form.
 * Labelling that button "Start drying" told the operator the wrong thing about
 * where they were going.
 */
export function actionForBatch(batch: {
  stage: BatchStage;
  payment?: { status: "PENDING" | "PAID" | "FAILED" } | null;
}) {
  const action = nextActionByStage[batch.stage];
  if (!action) return null;

  if (batch.stage === "awaiting-payment" && batch.payment?.status !== "PAID") {
    return { ...action, label: "Share payment link", heading: "Awaiting payment" };
  }
  return action;
}

/**
 * How a stage should read for a given batch.
 *
 * A paid batch waits at the payment stage until drying starts, so "Payment"
 * alone is misleading once the money has landed.
 */
export function stageLabelFor(batch: {
  stage: BatchStage;
  payment?: { status: "PENDING" | "PAID" | "FAILED" };
}): string {
  if (batch.stage === "awaiting-payment") {
    return batch.payment?.status === "PAID" ? "Paid" : "Awaiting payment";
  }
  return STAGE_LABEL[batch.stage] ?? batch.stage;
}
