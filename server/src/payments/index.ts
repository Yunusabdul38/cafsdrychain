import { env } from '../env.js';
import type { PaymentProvider } from './provider.js';
import { BachsProvider } from './bachs.js';

let cached: PaymentProvider | null = null;

/**
 * The configured gateway, built on first use.
 *
 * Lazy on purpose: a provider validates its credentials in its constructor, so
 * building at import time would take the whole server down over a missing
 * payment key — even where drying fees are off and no gateway is ever used.
 */
export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;

  switch (env.PAYMENT_PROVIDER) {
    case 'bachs':
      cached = new BachsProvider(env.BACHS_SECRET_KEY ?? '', env.BACHS_WEBHOOK_SECRET);
      return cached;
    default:
      // Unreachable while the enum has one member, but this is what a new
      // provider must satisfy: add a class implementing PaymentProvider and a
      // case here.
      throw new Error(`PAYMENT_PROVIDER "${env.PAYMENT_PROVIDER}" is not implemented`);
  }
}

export * from './provider.js';
