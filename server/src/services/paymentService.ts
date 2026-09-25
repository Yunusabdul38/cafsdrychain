import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error.js';
import { logger } from '../lib/logger.js';
import { getPaymentProvider, type PaymentState } from '../payments/index.js';
import { feesApplyAt } from './settingsService.js';

/** Naira are entered by operators; kobo are what we store. */
const KOBO = 100;

export function nairaToKobo(naira: number): number {
  return Math.round(naira * KOBO);
}

/**
 * Set the drying fee for a batch and issue its payment link.
 *
 * Only valid straight after registration. Re-running it while a payment is
 * still unpaid replaces the link (the operator mistyped the amount); once paid,
 * the fee is settled and cannot be changed.
 */
export async function createPaymentForBatch(batchId: string, amountNaira: number) {
  const batch = await prisma.batch.findUnique({
    where: { batchId },
    include: { payment: true, operator: { select: { email: true, name: true } } },
  });
  if (!batch) throw new AppError(404, 'Batch not found');

  if (batch.payment?.status === 'PAID') {
    throw new AppError(409, 'This batch has already been paid for');
  }
  if (batch.stage !== 'REGISTERED' && batch.stage !== 'AWAITING_PAYMENT') {
    throw new AppError(400, 'The drying fee can only be set before drying begins');
  }

  if (!(await feesApplyAt(batch.location))) {
    throw new AppError(
      400,
      `${batch.location} is not collecting drying fees. An administrator can turn them on for this hub.`
    );
  }

  const amount = nairaToKobo(amountNaira);
  const { reference, checkoutUrl } = await getPaymentProvider().createLink({
    batchId: batch.batchId,
    amount,
    currency: 'NGN',
    description: `Drying fee for ${batch.product} (${batch.batchId})`,
    // The operator who took the batch in is the account the fee is billed to:
    // it is the only verified identity attached to a batch.
    payer: { email: batch.operator.email, name: batch.operator.name },
  });

  const data = {
    amount,
    currency: 'NGN',
    provider: getPaymentProvider().name,
    reference,
    checkoutUrl,
    status: 'PENDING' as const,
    paidAt: null,
  };

  const [payment] = await prisma.$transaction([
    prisma.payment.upsert({
      where: { batchId: batch.id },
      create: { batchId: batch.id, ...data },
      update: data,
    }),
    prisma.batch.update({
      where: { id: batch.id },
      data: { stage: 'AWAITING_PAYMENT' },
    }),
  ]);

  logger.info(
    { batchId: batch.batchId, reference, amount, provider: getPaymentProvider().name },
    'Drying fee set — payment link issued'
  );
  return payment;
}

/**
 * Record a batch as free to dry. Kept as a real PAID payment of zero rather
 * than a lifecycle bypass, so "no fee was charged" is an auditable fact and the
 * drying gate stays the single place that decides.
 */
export async function waivePaymentForBatch(batchId: string) {
  const batch = await prisma.batch.findUnique({
    where: { batchId },
    include: { payment: true },
  });
  if (!batch) throw new AppError(404, 'Batch not found');
  if (await feesApplyAt(batch.location)) {
    throw new AppError(400, 'Drying fees are switched on — set a fee for this batch');
  }
  if (batch.payment?.status === 'PAID') return batch.payment;
  if (batch.stage !== 'REGISTERED' && batch.stage !== 'AWAITING_PAYMENT') {
    throw new AppError(400, 'This batch has already moved past the payment step');
  }

  const data = {
    amount: 0,
    currency: 'NGN',
    provider: 'waived',
    reference: `WAIVED-${batch.batchId}`,
    checkoutUrl: '',
    status: 'PAID' as const,
    paidAt: new Date(),
  };

  const [payment] = await prisma.$transaction([
    prisma.payment.upsert({
      where: { batchId: batch.id },
      create: { batchId: batch.id, ...data },
      update: data,
    }),
    prisma.batch.update({ where: { id: batch.id }, data: { stage: 'AWAITING_PAYMENT' } }),
  ]);

  logger.info({ batchId: batch.batchId }, 'Drying fee waived — batch cleared to dry');
  return payment;
}

/**
 * Ask the gateway what really happened to a batch's fee, and settle it if it
 * has resolved. The webhook is the normal path; this is the recovery one.
 *
 * Webhooks go missing for reasons outside this app — a redeploy mid-delivery, a
 * rotated secret, exhausted retries — and without a way to re-ask, a batch whose
 * fee was genuinely paid would sit at AWAITING_PAYMENT forever.
 *
 * Safe to call repeatedly: an already-settled payment is returned untouched.
 */
export async function reconcileBatchPayment(batchId: string) {
  const batch = await prisma.batch.findUnique({
    where: { batchId },
    include: { payment: true },
  });
  if (!batch?.payment) throw new AppError(404, 'No payment has been set for this batch');

  const payment = batch.payment;
  // Only a paid fee is settled for good. FAILED is not terminal here: an
  // expired checkout is recorded as failed, and a bank transfer the supplier
  // had already started can still land afterwards — so re-asking has to stay
  // possible, or that money would be taken with the batch never released.
  if (payment.status === 'PAID') return payment;

  const state = await getPaymentProvider().verify(payment.reference);
  if (state === payment.status) return payment;

  logger.info({ batchId, reference: payment.reference, state }, 'Payment reconciled from the gateway');
  return (await settlePayment(payment.reference, state)) ?? payment;
}


export async function getPaymentForBatch(batchId: string) {
  const batch = await prisma.batch.findUnique({
    where: { batchId },
    include: { payment: true },
  });
  if (!batch) throw new AppError(404, 'Batch not found');
  return batch.payment;
}

/**
 * Record the outcome of a payment. Idempotent: a repeated webhook for a
 * reference already marked PAID is accepted and changes nothing, which is the
 * behaviour every gateway's retry policy assumes.
 */
export async function settlePayment(reference: string, status: PaymentState) {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) {
    logger.warn({ reference }, 'Payment callback for an unknown reference — ignored');
    return null;
  }
  if (payment.status === 'PAID') {
    logger.info({ reference }, 'Payment already settled — callback ignored');
    return payment;
  }
  if (status === 'PENDING') return payment;

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { status, paidAt: status === 'PAID' ? new Date() : null },
  });
  logger.info({ reference, status }, 'Payment settled');
  return updated;
}

/**
 * The gate drying is held behind. Called by the batch lifecycle rather than the
 * client, so an unpaid batch cannot be advanced by crafting a request.
 */
export async function assertPaidForDrying(batchDbId: string) {
  const payment = await prisma.payment.findUnique({ where: { batchId: batchDbId } });
  if (!payment) {
    throw new AppError(402, 'Set the drying fee and record payment before drying can start');
  }
  if (payment.status !== 'PAID') {
    throw new AppError(402, 'Payment for this batch has not been confirmed yet');
  }
}
