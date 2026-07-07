import type { BatchStage, ChainStatus, Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { metadataHash } from '../lib/hash.js';
import { AppError } from '../middleware/error.js';
import {
  relayRegister,
  relayDrying,
  relayLogistics,
  type RelayResult,
} from '../chain/relayer.js';
import type { AdvanceBatchInput, CreateBatchInput } from '../schemas/index.js';

const ORDER: BatchStage[] = [
  'REGISTERED',
  'DRYING',
  'DRIED',
  'STORED',
  'IN_TRANSIT',
  'DELIVERED',
];

const EVENT_TITLE: Record<BatchStage, string> = {
  REGISTERED: 'Batch registered',
  DRYING: 'Drying started',
  DRIED: 'Drying completed',
  STORED: 'Moved to storage',
  IN_TRANSIT: 'Dispatched',
  DELIVERED: 'Delivered',
};

function nextStage(stage: BatchStage): BatchStage | null {
  const i = ORDER.indexOf(stage);
  return i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : null;
}

function newBatchId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  const seg = (n: number) =>
    Array.from({ length: n }, () => chars[crypto.randomInt(chars.length)]).join('');
  return `DRY-${seg(4)}-${seg(3)}`;
}

const include = {
  operator: { select: { id: true, name: true, location: true, wallet: { select: { index: true, address: true } } } },
  events: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.BatchInclude;

/** Compute the tamper-evidence hash from the batch's canonical record. */
function hashBatch(b: Record<string, unknown>): string {
  return metadataHash({
    batchId: b.batchId,
    product: b.product,
    source: b.source,
    sourceType: b.sourceType,
    supplier: b.supplier,
    freshWeight: b.freshWeight,
    finalWeight: b.finalWeight ?? null,
    moisture: b.moisture ?? null,
    stage: b.stage,
    storageLocation: b.storageLocation ?? null,
    destination: b.destination ?? null,
  });
}

export async function createBatch(operatorId: string, input: CreateBatchInput) {
  const operator = await prisma.user.findUnique({
    where: { id: operatorId },
    include: { wallet: true },
  });
  if (!operator) throw new AppError(404, 'Operator not found');

  const batchId = newBatchId();
  const hash = hashBatch({ ...input, batchId, stage: 'REGISTERED' });

  const batch = await prisma.batch.create({
    data: {
      batchId,
      product: input.product,
      sourceType: input.sourceType,
      source: input.source,
      supplier: input.supplier,
      freshWeight: input.freshWeight,
      deliveryDate: input.deliveryDate,
      location: input.location,
      stage: 'REGISTERED',
      metadataHash: hash,
      operatorId,
      events: {
        create: {
          stage: 'REGISTERED',
          title: EVENT_TITLE.REGISTERED,
          actor: operator.name,
          metadataHash: hash,
        },
      },
    },
    include,
  });

  // Write on-chain (skipped gracefully if chain disabled).
  if (operator.wallet) {
    const res = await relayRegister(
      operator.wallet.index,
      batchId,
      input.location,
      input.freshWeight,
      hash
    );
    await persistChain(batch.id, res);
  }

  return getBatch(batchId);
}

export async function advanceBatch(
  actor: { id: string; role: string; name: string },
  batchId: string,
  input: AdvanceBatchInput
) {
  const batch = await prisma.batch.findUnique({
    where: { batchId },
    include: { operator: { include: { wallet: true } } },
  });
  if (!batch) throw new AppError(404, 'Batch not found');

  // Operators may only advance their own batches; admins may advance any.
  if (actor.role === 'OPERATOR' && batch.operatorId !== actor.id) {
    throw new AppError(403, 'You are not assigned to this batch');
  }

  const target = nextStage(batch.stage);
  if (!target) throw new AppError(400, 'Batch lifecycle is already complete');

  const now = new Date();
  const data: Prisma.BatchUpdateInput = { stage: target };

  switch (target) {
    case 'DRYING':
      data.dryingStart = input.dryingStart ?? now;
      break;
    case 'DRIED':
      data.dryingEnd = input.dryingEnd ?? now;
      if (input.finalWeight !== undefined) data.finalWeight = input.finalWeight;
      if (input.moisture !== undefined) data.moisture = input.moisture;
      if (input.quality) data.quality = input.quality;
      break;
    case 'STORED':
      if (input.storageLocation) data.storageLocation = input.storageLocation;
      if (input.packaging) data.packaging = input.packaging;
      break;
    case 'IN_TRANSIT':
      if (input.transport) data.transport = input.transport;
      if (input.destination) data.destination = input.destination;
      break;
    case 'DELIVERED':
      if (input.destination) data.destination = input.destination;
      break;
  }

  const merged = { ...batch, ...data, stage: target };
  const hash = hashBatch(merged as Record<string, unknown>);
  data.metadataHash = hash;

  await prisma.batch.update({
    where: { id: batch.id },
    data: {
      ...data,
      events: {
        create: {
          stage: target,
          title: EVENT_TITLE[target],
          actor: actor.name,
          metadataHash: hash,
        },
      },
    },
  });

  // On-chain write via the operator's derived wallet (gas paid by relayer).
  const index = batch.operator.wallet?.index;
  if (index !== undefined) {
    let res: RelayResult;
    const facility = (data.storageLocation as string) || batch.location;
    if (target === 'DRYING') {
      res = await relayDrying(index, batchId, facility, 1, batch.freshWeight, hash);
    } else if (target === 'DRIED') {
      res = await relayDrying(index, batchId, facility, 2, (input.finalWeight ?? batch.freshWeight), hash);
    } else if (target === 'STORED') {
      res = await relayLogistics(index, batchId, facility, 3, hash);
    } else if (target === 'IN_TRANSIT') {
      res = await relayLogistics(index, batchId, facility, 4, hash);
    } else {
      res = await relayLogistics(index, batchId, facility, 5, hash);
    }
    await persistChain(batch.id, res, true);
  }

  return getBatch(batchId);
}

async function persistChain(id: string, res: RelayResult, latestEvent = false) {
  if (res.status === 'SKIPPED') return;
  const chainStatus = res.status as ChainStatus;
  await prisma.batch.update({
    where: { id },
    data: { chainStatus, txHash: res.txHash ?? undefined },
  });
  if (latestEvent) {
    const last = await prisma.batchEvent.findFirst({
      where: { batchId: id },
      orderBy: { createdAt: 'desc' },
    });
    if (last) {
      await prisma.batchEvent.update({
        where: { id: last.id },
        data: { chainStatus, txHash: res.txHash ?? undefined },
      });
    }
  }
}

export function listBatches(filter?: { operatorId?: string }) {
  return prisma.batch.findMany({
    where: filter?.operatorId ? { operatorId: filter.operatorId } : undefined,
    orderBy: { createdAt: 'desc' },
    include,
  });
}

export async function getBatch(batchId: string) {
  const batch = await prisma.batch.findUnique({ where: { batchId }, include });
  if (!batch) throw new AppError(404, 'Batch not found');
  return batch;
}

/** Public traceability view — no internal identifiers exposed. */
export async function getPublicBatch(batchId: string) {
  const b = await getBatch(batchId);
  return {
    batchId: b.batchId,
    product: b.product,
    source: b.source,
    sourceType: b.sourceType,
    supplier: b.supplier,
    freshWeight: b.freshWeight,
    finalWeight: b.finalWeight,
    moisture: b.moisture,
    quality: b.quality,
    stage: b.stage,
    location: b.location,
    storageLocation: b.storageLocation,
    destination: b.destination,
    deliveryDate: b.deliveryDate,
    verified: b.chainStatus === 'CONFIRMED',
    metadataHash: b.metadataHash,
    txHash: b.txHash,
    timeline: b.events.map((e) => ({
      stage: e.stage,
      title: e.title,
      actor: e.actor,
      timestamp: e.createdAt,
      txHash: e.txHash,
    })),
  };
}
