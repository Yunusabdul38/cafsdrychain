import { env } from '../env.js';
import { logger } from '../lib/logger.js';
import type { PaymentProvider } from './provider.js';
import { StubProvider } from './stub.js';

/**
 * Chooses the gateway from PAYMENT_PROVIDER. Add a real provider by writing a
 * class that satisfies PaymentProvider and registering it here.
 */
function build(): PaymentProvider {
  switch (env.PAYMENT_PROVIDER) {
    // case 'paystack':
    //   return new PaystackProvider(env.PAYSTACK_SECRET_KEY);
    case 'stub':
    default:
      if (env.NODE_ENV === 'production') {
        logger.error(
          'PAYMENT_PROVIDER is "stub" in production — payments can be marked paid without money changing hands.'
        );
      }
      return new StubProvider();
  }
}

export const paymentProvider: PaymentProvider = build();

export * from './provider.js';
