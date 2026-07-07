export type Role = "operator" | "admin";

export type BatchStage =
  | "registered"
  | "drying"
  | "dried"
  | "stored"
  | "in-transit"
  | "delivered";

export type TimelineEvent = {
  stage: BatchStage | "verified";
  title: string;
  actor: string;
  timestamp: string; // ISO
  txHash: string;
  details?: { label: string; value: string }[];
};

export type Batch = {
  id: string; // Batch ID e.g. DRY-2K7F-9X1
  product: string;
  sourceType: "Farm" | "Market";
  source: string; // farm / market name
  supplier: string;
  freshWeight: number; // kg
  finalWeight?: number; // kg
  moisture?: number; // %
  deliveryDate: string; // ISO date
  dryingStart?: string;
  dryingEnd?: string;
  quality?: string;
  storageLocation?: string;
  packaging?: string;
  transport?: string;
  destination?: string;
  stage: BatchStage;
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
