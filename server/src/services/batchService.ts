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
import { assertPaidForDrying, waivePaymentForBatch } from './paymentService.js';
import { feesApplyAt } from './settingsService.js';

/** Shortest run that can be recorded between drying start and completion. */
const MIN_DRYING_MS = 60 * 60 * 1000;

const ORDER: BatchStage[] = [
  'REGISTERED',
  'AWAITING_PAYMENT',
  'DRYING',
  'DRIED',
  'DELIVERED',
];

const EVENT_TITLE: Record<BatchStage, string> = {
  REGISTERED: 'Batch registered',
  AWAITING_PAYMENT: 'Drying fee set',
  DRYING: 'Drying started',
  DRIED: 'Drying completed',
  // Retired stages. Unreachable for new batches, kept so historical events
  // still render a title.
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
  payment: true,
} satisfies Prisma.BatchInclude;

/** Compute the tamper-evidence hash from the batch's canonical record. */
function hashBatch(b: Record<string, unknown>): string {
  return metadataHash({
    batchId: b.batchId,
    category: b.category,
    product: b.product,
    source: b.source,
    sourceType: b.sourceType,
    supplier: b.supplier,
    freshWeight: b.freshWeight,
    finalWeight: b.finalWeight ?? null,
    moisture: b.moisture ?? null,
    dryingMethod: b.dryingMethod ?? null,
    stage: b.stage,
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
  // The entry date is when the operator confirms registration — recorded here
  // rather than accepted from the client, so it can't be back- or post-dated.
  const entryDate = new Date();
  const hash = hashBatch({ ...input, batchId, stage: 'REGISTERED' });

  const batch = await prisma.batch.create({
    data: {
      batchId,
      category: input.category,
      product: input.product,
      sourceType: input.sourceType,
      source: input.source,
      freshWeight: input.freshWeight,
      entryDate,
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

  // Write on-chain, signed by the operator's derived wallet (gas paid by relayer).
  if (operator.wallet) {
    const res = await relayRegister(
      operator.wallet.index,
      batchId,
      input.location,
      input.freshWeight,
      hash
    );
    await persistChain(batch.id, res, true);
  }

  // Where no fee is charged — globally off, or this hub does not collect —
  // there is nothing for the operator to do, so the payment step is settled
  // here as a recorded zero fee. They never see it.
  if (!(await feesApplyAt(input.location))) {
    await waivePaymentForBatch(batchId);
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

  // Recording a stage is field work: only an operator, and only at their own
  // hub. Admins oversee and audit; they do not stand in for an operator, so
  // there is no bypass here even though the route already blocks them.
  if (actor.role !== 'OPERATOR') {
    throw new AppError(403, 'Only an operator at the hub can record a batch stage');
  }

  const actorUser = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { location: true },
  });
  const sameHub = actorUser?.location && actorUser.location === batch.location;
  if (!sameHub) {
    throw new AppError(403, 'You are not assigned to the hub where this batch is located');
  }

  // Optimistic-lock guard: if the caller declares the stage they expect the
  // batch to be in and it no longer matches, another operator already advanced
  // it — return 409 so the client can refresh and show the up-to-date state.
  if (input.expectedStage && input.expectedStage !== batch.stage) {
    throw new AppError(
      409,
      `This step has already been recorded. The batch is now at stage "${batch.stage}". Please refresh to see the latest status.`
    );
  }

  const target = nextStage(batch.stage);
  if (!target) throw new AppError(400, 'Batch lifecycle is already complete');

  // AWAITING_PAYMENT is entered by setting the fee (see paymentService), not by
  // advancing — and drying stays locked until the money is confirmed.
  if (target === 'AWAITING_PAYMENT') {
    if (await feesApplyAt(batch.location)) {
      throw new AppError(400, 'Set the drying fee for this batch to continue');
    }
    // Fees were switched off, or this hub stopped collecting, after the batch
    // was registered: clear the step rather than stranding it.
    await waivePaymentForBatch(batchId);
    return getBatch(batchId);
  }
  if (target === 'DRYING') {
    await assertPaidForDrying(batch.id);
  }

  const now = new Date();

  // Ordering rules the API schema cannot see: a batch cannot be dried before it
  // was taken in, and drying cannot finish before it started.
  if (input.dryingStart && input.dryingStart < batch.entryDate) {
    throw new AppError(400, 'Drying cannot start before the batch entry date');
  }
  // Mirrors the registry's on-chain rule: drying removes water, so a final
  // weight above the intake weight is a mis-entry. Enforced here too, or the
  // record would save off-chain and then fail silently when relayed.
  if (input.finalWeight !== undefined && input.finalWeight > batch.freshWeight) {
    throw new AppError(
      400,
      `Final weight cannot exceed the fresh weight of ${batch.freshWeight} kg`
    );
  }

  if (input.dryingEnd) {
    const startedAt = batch.dryingStart ?? input.dryingStart;
    // Solar drying takes hours; anything shorter is a mis-entry, not a record.
    if (startedAt && input.dryingEnd.getTime() - startedAt.getTime() < MIN_DRYING_MS) {
      throw new AppError(
        400,
        'Drying must run for at least an hour before it can be completed'
      );
    }
  }

  const data: Prisma.BatchUpdateInput = { stage: target };

  switch (target) {
    case 'DRYING':
      data.dryingStart = input.dryingStart ?? now;
      if (input.dryingMethod) data.dryingMethod = input.dryingMethod;
      break;
    case 'DRIED':
      data.dryingEnd = input.dryingEnd ?? now;
      if (input.finalWeight !== undefined) data.finalWeight = input.finalWeight;
      if (input.moisture !== undefined) data.moisture = input.moisture;
      if (input.quality) data.quality = input.quality;
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
          note: input.notes?.trim() || null,
          metadataHash: hash,
        },
      },
    },
  });

  // On-chain write signed by the operator's derived wallet (gas paid by relayer).
  const index = batch.operator.wallet?.index;
  if (index !== undefined) {
    let res: RelayResult;
    const facility = batch.location;
    if (target === 'DRYING') {
      res = await relayDrying(index, batchId, facility, 1, batch.freshWeight, hash);
    } else if (target === 'DRIED') {
      res = await relayDrying(index, batchId, facility, 2, input.finalWeight ?? batch.freshWeight, hash);
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

export function listBatches(filter?: { operatorId?: string; location?: string }) {
  return prisma.batch.findMany({
    where: filter?.operatorId
      ? { operatorId: filter.operatorId }
      : filter?.location
        ? { location: filter.location }
        : undefined,
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
    category: b.category,
    product: b.product,
    source: b.source,
    sourceType: b.sourceType,
    freshWeight: b.freshWeight,
    finalWeight: b.finalWeight,
    moisture: b.moisture,
    quality: b.quality,
    dryingMethod: b.dryingMethod,
    dryingStart: b.dryingStart,
    dryingEnd: b.dryingEnd,
    stage: b.stage,
    location: b.location,
    destination: b.destination,
    entryDate: b.entryDate,
    verified: b.chainStatus === 'CONFIRMED',
    metadataHash: b.metadataHash,
    txHash: b.txHash,
    timeline: b.events.map((e) => ({
      stage: e.stage,
      title: e.title,
      actor: e.actor,
      note: e.note,
      timestamp: e.createdAt,
      txHash: e.txHash,
    })),
  };
}
