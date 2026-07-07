import type {
  Batch,
  BatchStage,
  ChainRecord,
  Operator,
  Role,
} from "./types";

export const STAGE_LABEL: Record<BatchStage, string> = {
  registered: "Registered",
  drying: "Drying",
  dried: "Dried",
  stored: "Stored",
  "in-transit": "In transit",
  delivered: "Delivered",
};

export const STAGE_ORDER: BatchStage[] = [
  "registered",
  "drying",
  "dried",
  "stored",
  "in-transit",
  "delivered",
];

function tx() {
  const hex = "0123456789abcdef";
  let s = "0x";
  for (let i = 0; i < 12; i++) s += hex[Math.floor(Math.random() * 16)];
  return s + "…" + hex[3] + hex[9] + hex[1] + hex[5];
}

export const batches: Batch[] = [
  {
    id: "DRY-2K7F-9X1",
    product: "Sun-dried Mango",
    sourceType: "Farm",
    source: "Ola Farms",
    supplier: "Ibrahim Ola",
    freshWeight: 480,
    finalWeight: 96,
    moisture: 12,
    deliveryDate: "2026-06-28",
    dryingStart: "2026-06-29T07:10:00Z",
    dryingEnd: "2026-07-01T16:40:00Z",
    quality: "Grade A · uniform colour, no mould",
    storageLocation: "Warehouse B · Rack 14",
    packaging: "Vacuum-sealed 2kg pouches",
    transport: "GreenLogistics · Truck NG-882",
    destination: "FreshMart Distribution · Lagos",
    stage: "delivered",
    operator: "Amara Nwosu",
    location: "Oyo Solar Hub",
    verified: true,
    txHash: tx(),
    timeline: [
      {
        stage: "registered",
        title: "Batch registered",
        actor: "Amara Nwosu",
        timestamp: "2026-06-28T09:02:00Z",
        txHash: tx(),
        details: [
          { label: "Fresh weight", value: "480 kg" },
          { label: "Source", value: "Ola Farms" },
        ],
      },
      {
        stage: "drying",
        title: "Drying started",
        actor: "Amara Nwosu",
        timestamp: "2026-06-29T07:10:00Z",
        txHash: tx(),
      },
      {
        stage: "dried",
        title: "Drying completed",
        actor: "Amara Nwosu",
        timestamp: "2026-07-01T16:40:00Z",
        txHash: tx(),
        details: [
          { label: "Final weight", value: "96 kg" },
          { label: "Moisture", value: "12%" },
        ],
      },
      {
        stage: "stored",
        title: "Moved to storage",
        actor: "Amara Nwosu",
        timestamp: "2026-07-02T10:15:00Z",
        txHash: tx(),
        details: [{ label: "Location", value: "Warehouse B · Rack 14" }],
      },
      {
        stage: "delivered",
        title: "Delivered to buyer",
        actor: "GreenLogistics",
        timestamp: "2026-07-04T13:30:00Z",
        txHash: tx(),
        details: [{ label: "Destination", value: "FreshMart · Lagos" }],
      },
    ],
  },
  {
    id: "DRY-8H3D-4T0",
    product: "Dried Tomato",
    sourceType: "Market",
    source: "Bodija Market",
    supplier: "Chinwe Traders",
    freshWeight: 320,
    finalWeight: 58,
    moisture: 14,
    deliveryDate: "2026-07-02",
    dryingStart: "2026-07-02T08:00:00Z",
    dryingEnd: "2026-07-04T15:00:00Z",
    quality: "Grade B · slight colour variance",
    storageLocation: "Warehouse A · Rack 3",
    stage: "stored",
    operator: "Amara Nwosu",
    location: "Oyo Solar Hub",
    verified: true,
    txHash: tx(),
    timeline: [
      {
        stage: "registered",
        title: "Batch registered",
        actor: "Amara Nwosu",
        timestamp: "2026-07-02T08:20:00Z",
        txHash: tx(),
      },
      {
        stage: "drying",
        title: "Drying started",
        actor: "Amara Nwosu",
        timestamp: "2026-07-02T09:00:00Z",
        txHash: tx(),
      },
      {
        stage: "dried",
        title: "Drying completed",
        actor: "Amara Nwosu",
        timestamp: "2026-07-04T15:00:00Z",
        txHash: tx(),
      },
      {
        stage: "stored",
        title: "Moved to storage",
        actor: "Amara Nwosu",
        timestamp: "2026-07-05T09:40:00Z",
        txHash: tx(),
      },
    ],
  },
  {
    id: "DRY-5R1P-7C2",
    product: "Dried Pineapple",
    sourceType: "Farm",
    source: "Sunrise Orchards",
    supplier: "Tunde Bello",
    freshWeight: 610,
    moisture: 46,
    deliveryDate: "2026-07-05",
    dryingStart: "2026-07-06T07:30:00Z",
    stage: "drying",
    operator: "Kofi Mensah",
    location: "Kano Solar Hub",
    verified: true,
    txHash: tx(),
    timeline: [
      {
        stage: "registered",
        title: "Batch registered",
        actor: "Kofi Mensah",
        timestamp: "2026-07-05T14:10:00Z",
        txHash: tx(),
      },
      {
        stage: "drying",
        title: "Drying started",
        actor: "Kofi Mensah",
        timestamp: "2026-07-06T07:30:00Z",
        txHash: tx(),
      },
    ],
  },
  {
    id: "DRY-9M4B-2K8",
    product: "Dried Ginger",
    sourceType: "Farm",
    source: "Highland Roots",
    supplier: "Grace Okon",
    freshWeight: 275,
    deliveryDate: "2026-07-06",
    stage: "registered",
    operator: "Kofi Mensah",
    location: "Kano Solar Hub",
    verified: true,
    txHash: tx(),
    timeline: [
      {
        stage: "registered",
        title: "Batch registered",
        actor: "Kofi Mensah",
        timestamp: "2026-07-06T11:25:00Z",
        txHash: tx(),
      },
    ],
  },
  {
    id: "DRY-3F6Q-1W9",
    product: "Sun-dried Mango",
    sourceType: "Farm",
    source: "Ola Farms",
    supplier: "Ibrahim Ola",
    freshWeight: 520,
    finalWeight: 104,
    moisture: 11,
    deliveryDate: "2026-06-30",
    dryingStart: "2026-07-01T07:00:00Z",
    dryingEnd: "2026-07-03T17:00:00Z",
    quality: "Grade A",
    storageLocation: "Warehouse B · Rack 9",
    packaging: "Kraft 1kg bags",
    transport: "GreenLogistics · Truck NG-771",
    destination: "Export · Accra",
    stage: "in-transit",
    operator: "Amara Nwosu",
    location: "Oyo Solar Hub",
    verified: true,
    txHash: tx(),
    timeline: [
      {
        stage: "registered",
        title: "Batch registered",
        actor: "Amara Nwosu",
        timestamp: "2026-06-30T08:45:00Z",
        txHash: tx(),
      },
      {
        stage: "drying",
        title: "Drying started",
        actor: "Amara Nwosu",
        timestamp: "2026-07-01T07:00:00Z",
        txHash: tx(),
      },
      {
        stage: "dried",
        title: "Drying completed",
        actor: "Amara Nwosu",
        timestamp: "2026-07-03T17:00:00Z",
        txHash: tx(),
      },
      {
        stage: "in-transit",
        title: "Dispatched",
        actor: "GreenLogistics",
        timestamp: "2026-07-06T08:00:00Z",
        txHash: tx(),
      },
    ],
  },
  {
    id: "DRY-7L2X-6B4",
    product: "Dried Chilli",
    sourceType: "Market",
    source: "Kano Central Market",
    supplier: "Sani Yusuf",
    freshWeight: 190,
    finalWeight: 41,
    moisture: 10,
    deliveryDate: "2026-06-27",
    dryingStart: "2026-06-27T08:00:00Z",
    dryingEnd: "2026-06-29T14:00:00Z",
    quality: "Grade A",
    storageLocation: "Warehouse C · Rack 1",
    packaging: "PP 5kg sacks",
    transport: "Northline · Truck KN-204",
    destination: "SpiceCo · Abuja",
    stage: "delivered",
    operator: "Kofi Mensah",
    location: "Kano Solar Hub",
    verified: true,
    txHash: tx(),
    timeline: [
      {
        stage: "registered",
        title: "Batch registered",
        actor: "Kofi Mensah",
        timestamp: "2026-06-27T07:30:00Z",
        txHash: tx(),
      },
      {
        stage: "delivered",
        title: "Delivered to buyer",
        actor: "Northline",
        timestamp: "2026-07-01T12:00:00Z",
        txHash: tx(),
      },
    ],
  },
];

export const operators: Operator[] = [
  {
    id: "OP-01",
    name: "Amara Nwosu",
    email: "amara@cafsdrychain.io",
    location: "Oyo Solar Hub",
    role: "operator",
    status: "active",
    batches: 3,
    joined: "2026-01-12",
  },
  {
    id: "OP-02",
    name: "Kofi Mensah",
    email: "kofi@cafsdrychain.io",
    location: "Kano Solar Hub",
    role: "operator",
    status: "active",
    batches: 3,
    joined: "2026-02-03",
  },
  {
    id: "OP-03",
    name: "Zainab Bello",
    email: "zainab@cafsdrychain.io",
    location: "Kaduna Solar Hub",
    role: "operator",
    status: "inactive",
    batches: 0,
    joined: "2026-03-19",
  },
  {
    id: "AD-01",
    name: "David Eze",
    email: "david@cafsdrychain.io",
    location: "HQ · Ibadan",
    role: "admin",
    status: "active",
    batches: 0,
    joined: "2025-11-01",
  },
  {
    id: "AU-01",
    name: "NAFDAC Regulator",
    email: "regulator@nafdac.gov.ng",
    location: "Abuja",
    role: "auditor",
    status: "active",
    batches: 0,
    joined: "2026-04-08",
  },
];

export const chainRecords: ChainRecord[] = batches
  .flatMap((b) =>
    b.timeline.map((t) => ({
      txHash: t.txHash,
      batchId: b.id,
      action: t.title,
      actor: t.actor,
      timestamp: t.timestamp,
      block: 18_400_000 + Math.floor(Math.random() * 90000),
      status: "confirmed" as const,
    }))
  )
  .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

export const locations = [
  { name: "Oyo Solar Hub", batches: 3, active: 0, capacity: 78 },
  { name: "Kano Solar Hub", batches: 3, active: 1, capacity: 54 },
  { name: "Kaduna Solar Hub", batches: 0, active: 0, capacity: 0 },
];

export function metricsFor(role: Role) {
  const total = batches.length;
  const drying = batches.filter((b) => b.stage === "drying").length;
  const delivered = batches.filter((b) => b.stage === "delivered").length;
  const verified = batches.filter((b) => b.verified).length;
  const inStorage = batches.filter(
    (b) => b.stage === "stored" || b.stage === "in-transit"
  ).length;

  if (role === "admin") {
    return [
      { label: "Total batches", value: String(total), hint: "across 2 hubs" },
      { label: "Active drying", value: String(drying), hint: "in progress" },
      { label: "Operators", value: "2", hint: "active" },
      { label: "On-chain records", value: String(chainRecords.length), hint: "confirmed" },
    ];
  }
  if (role === "auditor") {
    return [
      { label: "Verified batches", value: String(verified), hint: `of ${total}` },
      { label: "On-chain records", value: String(chainRecords.length), hint: "confirmed" },
      { label: "Flagged", value: "0", hint: "no anomalies" },
      { label: "Hubs audited", value: "2", hint: "this month" },
    ];
  }
  // operator
  return [
    { label: "My batches", value: String(total), hint: "at your hub" },
    { label: "Drying now", value: String(drying), hint: "needs update" },
    { label: "In storage", value: String(inStorage), hint: "ready to ship" },
    { label: "Delivered", value: String(delivered), hint: "this month" },
  ];
}

export const products = [
  "Sun-dried Mango",
  "Dried Tomato",
  "Dried Pineapple",
  "Dried Ginger",
  "Dried Chilli",
  "Dried Plantain",
  "Dried Okra",
];

export function getBatch(id: string) {
  return batches.find((b) => b.id.toLowerCase() === id.toLowerCase());
}
