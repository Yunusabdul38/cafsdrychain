import type { BatchStage, ChainStatus, Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { metadataHash } from '../lib/hash.js';
import { AppError } from '../middleware/error.js';
import {
  relayRegister,
  relayDrying,
  relayLogistics,
  chainStateOf,
  forwarderNonce,
  awaitNonceAdvance,
  type RelayResult,
} from '../chain/relayer.js';
import { chainEnabled } from '../chain/client.js';
import { logger } from '../lib/logger.js';
import { env } from '../env.js';
import type { AdvanceBatchInput, CreateBatchInput } from '../schemas/index.js';
import { assertPaidForDrying, waivePaymentForBatch } from './paymentService.js';
import { feesApplyAt } from './settingsService.js';

/** Shortest run that can be recorded between drying start and completion. */
/** Solar drying takes hours; a shorter run is a mis-entry, not a record. */
const MIN_DRYING_MS = 60 * 60 * 1000;
/** Allowance for a device clock running slightly ahead of the server's. */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

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

  // Recorded times describe what has happened, so none may lie in the future —
  // or a completion time ahead of the clock would satisfy the hour unearned.
  const latest = now.getTime() + CLOCK_SKEW_MS;
  if (target === 'DRYING' && input.dryingStart && input.dryingStart.getTime() > latest) {
    throw new AppError(400, 'Drying cannot be recorded as starting at a time that has not happened yet');
  }
  if (target === 'DRIED') {
    const endedAt = input.dryingEnd ?? now;
    if (endedAt.getTime() > latest) {
      throw new AppError(400, 'Drying cannot be completed at a time that has not happened yet');
    }
    if (batch.dryingStart) {
      const ranMs = endedAt.getTime() - batch.dryingStart.getTime();
      if (ranMs < MIN_DRYING_MS) {
        // In minutes rather than clock times: the server does not know the
        // operator's timezone, and "in 37 minutes" needs none.
        const waitMin = Math.ceil((batch.dryingStart.getTime() + MIN_DRYING_MS - now.getTime()) / 60_000);
        throw new AppError(
          400,
          waitMin > 0
            ? `Drying must run for at least an hour. It can be completed in ${waitMin} minute${waitMin === 1 ? '' : 's'}.`
            : 'The completion time must be at least an hour after drying started.'
        );
      }
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
      // With collection off, nothing is recorded — not 0%, which would read as
      // a measurement and resurface on these batches if collection came back.
      // Enforced here, not just by hiding the field, so it holds for any client.
      if (input.moisture !== undefined && !env.HIDE_MOISTURE) data.moisture = input.moisture;
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

  // Write on-chain through the reconciler rather than relaying this stage
  // alone: if an earlier one never landed, the registry would reject this as an
  // invalid transition, so any gap has to be closed first. A batch already in
  // step costs one view call.
  //
  // A failure here leaves the record saved and the chain behind, which the next
  // write or an explicit reconcile will close. It is not thrown, because losing
  // an operator's work to a passing RPC error would be the worse outcome.
  if (batch.operator.wallet) {
    await reconcileBatchChain(batchId).catch((err) =>
      logger.error({ err, batchId }, 'Chain write failed — record saved, chain behind')
    );
  }

  return getBatch(batchId);
}

/**
 * The on-chain state each off-chain stage corresponds to.
 *
 * Payment is deliberately absent from the chain, so a batch awaiting or having
 * paid its fee sits at Registered there — that is agreement, not a gap.
 */
const CHAIN_STATE: Record<BatchStage, number> = {
  REGISTERED: 0,
  AWAITING_PAYMENT: 0,
  DRYING: 1,
  DRIED: 2,
  DELIVERED: 3,
};

/** Tries per stage before a reconcile gives up and leaves it to the next one. */
const MAX_STEP_ATTEMPTS = 3;

/**
 * Bring the chain up to date with what the database already records.
 *
 * A database write and a chain write cannot be made atomic — no two-phase
 * commit exists across them — and rolling the database back when a relay fails
 * would be worse: the transaction may have actually landed while the response
 * was lost, and the registry would then refuse the retry as an invalid
 * transition, stranding the batch with no way forward.
 *
 * So the database records what happened and this makes the chain agree,
 * replaying every stage the registry has not seen, in order. It reads the
 * registry's own state rather than trusting `chainStatus`, because the case
 * worth fixing is precisely the one where our record of the chain is wrong.
 *
 * Safe to call at any time: a batch already in step does nothing.
 */
export async function reconcileBatchChain(batchId: string) {
  if (!chainEnabled()) throw new AppError(400, 'Blockchain integration is switched off');

  const batch = await prisma.batch.findUnique({
    where: { batchId },
    include: { operator: { include: { wallet: true } } },
  });
  if (!batch) throw new AppError(404, 'Batch not found');

  const index = batch.operator.wallet?.index;
  if (index === undefined) {
    throw new AppError(400, "This batch's operator has no wallet, so nothing can be signed for it");
  }
  const hash = batch.metadataHash;
  if (!hash) throw new AppError(400, 'Batch has no metadata hash to anchor');

  const target = CHAIN_STATE[batch.stage];
  const [state, startNonce] = await Promise.all([chainStateOf(batchId), forwarderNonce(index)]);
  let current = state ?? -1;
  let nonce = startNonce;
  let attempts = 0;
  const replayed: string[] = [];

  // One stage at a time; the registry enforces the same order.
  //
  // Progress comes from confirmed receipts, not from re-reading the chain:
  // Base's RPC is load balanced, and a read straight after a write can reach a
  // node that has not caught up, so the step looked undone and was written
  // twice — which the registry rejects.
  while (current < target) {
    const res =
      current === -1
        ? await relayRegister(index, batchId, batch.location, batch.freshWeight, hash)
        : current === 0
          ? await relayDrying(index, batchId, batch.location, 1, batch.freshWeight, hash)
          : current === 1
            ? await relayDrying(index, batchId, batch.location, 2, batch.finalWeight ?? batch.freshWeight, hash)
            : await relayLogistics(index, batchId, batch.location, 3, hash);

    if (res.status !== 'CONFIRMED') {
      // Usually not a real failure: straight after a write, a load-balanced RPC
      // can report the chain a step behind or hand back a stale nonce, and the
      // step is refused. Mostly that happens at gas estimation and costs
      // nothing; occasionally the transaction is sent and reverts, costing a
      // fraction of a cent. Re-read and try again before giving up.
      if (++attempts > MAX_STEP_ATTEMPTS) {
        await persistChain(batch.id, res, true);
        throw new AppError(502, 'Could not write to the blockchain. The record is saved and will be retried.');
      }
      await new Promise((r) => setTimeout(r, 2000));
      current = (await chainStateOf(batchId)) ?? -1;
      nonce = await forwarderNonce(index);
      continue;
    }
    attempts = 0;
    await persistChain(batch.id, res, true);
    if (res.txHash) replayed.push(res.txHash);
    current += 1;

    // The next step is signed against the forwarder nonce, so it has to wait
    // until the node has registered this one — or it signs a stale nonce and
    // is refused.
    if (current < target) {
      if (!(await awaitNonceAdvance(index, nonce))) {
        throw new AppError(502, 'The blockchain did not confirm in time. The record is saved and will be retried.');
      }
      nonce += 1n;
    }
  }

  logger.info({ batchId, replayed: replayed.length, state: current }, 'Chain reconciled');
  return { batchId, chainState: current, replayed };
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
