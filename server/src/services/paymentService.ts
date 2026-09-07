import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error.js';
import { logger } from '../lib/logger.js';
import { paymentProvider, type PaymentState } from '../payments/index.js';
import { getSettings } from './settingsService.js';

/** Naira are entered by operators; kobo are what we store. */
const KOBO = 100;

export function nairaToKobo(naira: number): number {
  return Math.round(naira * KOBO);
}

export function koboToNaira(kobo: number): number {
  return kobo / KOBO;
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
    include: { payment: true },
  });
  if (!batch) throw new AppError(404, 'Batch not found');

  if (batch.payment?.status === 'PAID') {
    throw new AppError(409, 'This batch has already been paid for');
  }
  if (batch.stage !== 'REGISTERED' && batch.stage !== 'AWAITING_PAYMENT') {
    throw new AppError(400, 'The drying fee can only be set before drying begins');
  }

  const settings = await getSettings();
  if (!settings.feesEnabled) {
    throw new AppError(400, 'Drying fees are currently switched off by the administrator');
  }
  if (nairaToKobo(amountNaira) < settings.minimumFee) {
    throw new AppError(
      400,
      `The drying fee must be at least ${koboToNaira(settings.minimumFee)} naira`
    );
  }

  const amount = nairaToKobo(amountNaira);
  const { reference, checkoutUrl } = await paymentProvider.createLink({
    batchId: batch.batchId,
    amount,
    currency: 'NGN',
    description: `Drying fee for ${batch.product} (${batch.batchId})`,
  });

  const data = {
    amount,
    currency: 'NGN',
    provider: paymentProvider.name,
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
    { batchId: batch.batchId, reference, amount, provider: paymentProvider.name },
    'Drying fee set — payment link issued'
  );
  return payment;
}

/** Public checkout lookup — returns only what the payer needs to see. */
/**
 * Record a batch as free to dry. Kept as a real PAID payment of zero rather
 * than a lifecycle bypass, so "no fee was charged" is an auditable fact and the
 * drying gate stays the single place that decides.
 */
export async function waivePaymentForBatch(batchId: string) {
  const settings = await getSettings();
  if (settings.feesEnabled) {
    throw new AppError(400, 'Drying fees are switched on — set a fee for this batch');
  }

  const batch = await prisma.batch.findUnique({
    where: { batchId },
    include: { payment: true },
  });
  if (!batch) throw new AppError(404, 'Batch not found');
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

export async function getPaymentByReference(reference: string) {
  const payment = await prisma.payment.findUnique({
    where: { reference },
    include: { batch: { select: { batchId: true, product: true, location: true } } },
  });
  if (!payment) return null;
  return {
    reference: payment.reference,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider,
    paidAt: payment.paidAt,
    batch: payment.batch,
  };
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
