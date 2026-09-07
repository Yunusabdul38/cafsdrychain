import crypto from 'node:crypto';
import { env } from '../env.js';
import type {
  CreateLinkInput,
  CreateLinkResult,
  PaymentProvider,
  PaymentState,
  WebhookResult,
} from './provider.js';

/**
 * A stand-in gateway so the whole payment flow can be exercised before a real
 * provider is chosen. The checkout link points at a page in this app that lets
 * you mark the payment as succeeded or failed by hand.
 *
 * It refuses to run in production — see `assertNotProduction` — so it can never
 * become an accidental way to mark real batches paid.
 */
export class StubProvider implements PaymentProvider {
  readonly name = 'stub';

  async createLink(input: CreateLinkInput): Promise<CreateLinkResult> {
    const reference = `STUB-${input.batchId}-${crypto.randomBytes(4).toString('hex')}`;
    return {
      reference,
      checkoutUrl: `${env.APP_URL}/pay/${encodeURIComponent(reference)}`,
    };
  }

  /**
   * The stub holds no state of its own: the database row is the truth, so the
   * caller reconciles against it rather than asking the gateway.
   */
  async verify(): Promise<PaymentState> {
    return 'PENDING';
  }

  /** The stub has no webhook — payment is settled through the simulate route. */
  parseWebhook(): WebhookResult | null {
    return null;
  }
}

/** Guards the test-only settle route from ever being reachable in production. */
export function assertNotProduction(): void {
  if (env.NODE_ENV === 'production') {
    throw new Error('The stub payment provider is not available in production');
  }
}
