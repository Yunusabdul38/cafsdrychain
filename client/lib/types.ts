export type Role = "operator" | "admin";

export type BatchStage =
  | "registered"
  | "awaiting-payment"
  | "drying"
  | "dried"
  | "stored"
  | "in-transit"
  | "delivered";

export type TimelineEvent = {
  stage: BatchStage | "verified";
  title: string;
  actor: string;
  /** Free-text comment the operator left at this step, if any. */
  note?: string;
  timestamp: string; // ISO
  txHash: string;
  details?: { label: string; value: string }[];
};

export type Batch = {
  id: string; // Batch ID e.g. DRY-2K7F-9X1
  category: string;
  product: string;
  sourceType: "Farm" | "Market";
  source: string; // farm / market name
  freshWeight: number; // kg
  finalWeight?: number; // kg
  moisture?: number; // %
  entryDate: string; // ISO date — stamped when registration is confirmed
  dryingStart?: string;
  dryingEnd?: string;
  dryingMethod?: string;
  quality?: string;
  destination?: string;
  stage: BatchStage;
  payment?: {
    amount: number; // kobo
    currency: string;
    status: "PENDING" | "PAID" | "FAILED";
    reference: string;
    checkoutUrl: string;
    paidAt?: string;
  };
  operator: string;
  location: string; // drying facility
  verified: boolean;
  txHash: string; // registration tx
  timeline: TimelineEvent[];
};

export type Operator = {
  id: string;
  name: string;
  email: string;
  location: string;
  role: Role;
  status: "active" | "inactive";
  batches: number;
  joined: string;
};

export type ChainRecord = {
  txHash: string;
  batchId: string;
  action: string;
  actor: string;
  timestamp: string;
  block: number;
  status: "confirmed" | "pending";
};
