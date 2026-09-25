import crypto from 'node:crypto';
import { logger } from '../lib/logger.js';
import { AppError } from '../middleware/error.js';
import type {
  CreateLinkInput,
  CreateLinkResult,
  PaymentProvider,
  PaymentState,
  WebhookResult,
} from './provider.js';

const SANDBOX_URL = 'https://sandbox-api.bachs.io';
const LIVE_URL = 'https://api.bachs.io';

/**
 * How long a payment link stays usable. Bachs defaults to 60 minutes and caps
 * this at 1440. A fee is set when produce is taken in and paid whenever the
 * farmer can get to a bank, so an hour is too short to be workable.
 */
const LINK_LIFETIME_MINUTES = 1440;

/** Their session lifecycle, distinct from the payment's own status. */
type SessionStatus = 'open' | 'completed' | 'expired' | 'cancelled';

/** The status that actually says whether money moved. */
type PaymentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled';

type CreateResponse = {
  checkout_id: string;
  checkout_url: string;
  status: SessionStatus;
};

type SessionResponse = {
  checkout_id: string;
  status: SessionStatus;
  payment_status?: PaymentStatus;
  reference?: string;
};

type WebhookEvent = {
  type: string;
  data?: {
    checkout_id?: string;
    status?: string;
  };
};

/**
 * Map a Bachs outcome onto ours.
 *
 * `payment_status` is authoritative when present — a session can read
 * `completed` while the charge behind it is still processing. Only an expired
 * or cancelled session is terminal on the session status alone.
 */
function toPaymentState(session: SessionResponse): PaymentState {
  switch (session.payment_status) {
    case 'succeeded':
      return 'PAID';
    case 'failed':
    case 'canceled':
      return 'FAILED';
    case 'processing':
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_action':
      return 'PENDING';
  }
  if (session.status === 'expired' || session.status === 'cancelled') return 'FAILED';
  return 'PENDING';
}

/**
 * Which payment methods to offer, or undefined to let Bachs decide.
 *
 * Corridors are named per currency *and* method — there is no generic "card"
 * to filter on. Bank transfer is the cheapest by a wide margin (1.5% capped at
 * NGN 2,000, against 5% + $0.40 for a card) and Bachs only offers it in NGN, so
 * it is pinned for naira and left open elsewhere rather than naming a corridor
 * that does not exist.
 */
function corridorsFor(currency: string): string[] | undefined {
  return currency === 'NGN' ? ['NGN_BANK_TRANSFER'] : undefined;
}

/**
 * Bachs (https://bachs.io) — hosted checkout, NGN bank transfer and card.
 *
 * Two of their conventions differ from ours and are converted here rather than
 * leaking outwards:
 *
 *  - Money is a decimal string at the currency's precision ("500.00"), never
 *    minor units. We hold kobo, so every amount is divided on the way out.
 *  - The environment comes from the key prefix rather than a separate setting,
 *    so going live is a key swap in .env with no code change.
 */
export class BachsProvider implements PaymentProvider {
  readonly name = 'bachs';

  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly webhookSecret: string | undefined;

  constructor(secretKey: string, webhookSecret: string | undefined) {
    // A stray space or newline in .env would fail the prefix test below and
    // quietly send a live key to the sandbox.
    this.secretKey = secretKey.trim();
    this.webhookSecret = webhookSecret?.trim() || undefined;

    if (!this.secretKey) {
      throw new Error('BACHS_SECRET_KEY is required when PAYMENT_PROVIDER is "bachs"');
    }

    const live = this.secretKey.startsWith('sk_live_');
    this.baseUrl = live ? LIVE_URL : SANDBOX_URL;

    if (!live && !this.secretKey.startsWith('sk_sandbox_')) {
      logger.warn(
        { prefix: this.secretKey.slice(0, 11) },
        'BACHS_SECRET_KEY has an unrecognised prefix — treating it as a sandbox key.'
      );
    }

    // Which environment real money moves in is worth stating plainly at boot,
    // rather than inferring it from a key nobody should be printing.
    logger.info(
      { mode: live ? 'LIVE' : 'SANDBOX', webhooks: this.webhookSecret ? 'verified' : 'ignored' },
      'Bachs payments configured'
    );

    if (!this.webhookSecret) {
      // Without it parseWebhook rejects everything, so payments would sit
      // PENDING until someone reconciles them by hand.
      logger.warn(
        'BACHS_WEBHOOK_SECRET is not set — inbound Bachs webhooks cannot be verified and will be ignored.'
      );
    }
  }

  private async call<T>(
    path: string,
    init?: { method?: string; body?: string; headers?: Record<string, string> }
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: init?.method,
      body: init?.body,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...init?.headers,
      },
    });

    const text = await res.text();
    if (!res.ok) {
      // Their errors carry `detail` and a machine-readable `error_code`.
      let detail = text;
      let code: string | undefined;
      try {
        const parsed = JSON.parse(text) as { detail?: string; error_code?: string };
        code = parsed.error_code;
        detail = parsed.detail ?? text;
      } catch {
        /* keep the raw body */
      }

      logger.error({ path, status: res.status, code, detail }, 'Bachs request failed');

      // A 4xx means the request itself was wrong, and for this app that traces
      // back to something the operator typed — an amount over the NGN cap, say.
      // Surfacing the gateway's own wording beats a blank 500, which is what a
      // plain Error would become by the time it reached them.
      if (res.status >= 400 && res.status < 500) {
        throw new AppError(400, detail, code);
      }
      throw new Error(`Bachs ${init?.method ?? 'GET'} ${path} failed (${res.status}): ${detail}`);
    }
    return JSON.parse(text) as T;
  }

  async createLink(input: CreateLinkInput): Promise<CreateLinkResult> {
    const corridors = corridorsFor(input.currency);
    const body = {
      pricing: {
        currency: input.currency,
        amount: (input.amount / 100).toFixed(2),
      },
      customer: { email: input.payer.email, name: input.payer.name },
      ...(corridors && { payment_method_types: corridors }),
      // The batch id is both their dashboard reference and our metadata, so a
      // payment can be traced back from either side.
      reference: input.batchId,
      metadata: { batchId: input.batchId, description: input.description },
      expires_in_minutes: LINK_LIFETIME_MINUTES,
      // No success_url/cancel_url: this app has no page to return to. The payer
      // reaches Bachs' hosted checkout directly from a link or QR the operator
      // shared, so Bachs' own confirmation page is the end of the journey.
    };

    // Deliberately no Idempotency-Key. Bachs replays the *original* session for
    // a repeated key, expired ones included, so reusing `batchId-amount` would
    // hand an operator a dead link the second time they issued the same fee.
    // Creating a session moves no money, and the batch's payment row only ever
    // holds the newest reference, so an abandoned session simply expires.
    const session = await this.call<CreateResponse>('/v1/checkout-sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return { reference: session.checkout_id, checkoutUrl: session.checkout_url };
  }

  async verify(reference: string): Promise<PaymentState> {
    try {
      const session = await this.call<SessionResponse>(
        `/v1/checkout-sessions/${encodeURIComponent(reference)}`
      );
      return toPaymentState(session);
    } catch (err) {
      // An unreachable gateway is not evidence of failure: leaving it PENDING
      // keeps the batch gated rather than wrongly failing a paid fee.
      logger.error({ err, reference }, 'Bachs verify failed');
      return 'PENDING';
    }
  }

  /**
   * Verify `X-Bachs-Signature-V2` — `t=<unix>,v1=<hmac>` — where the digest is
   * HMAC-SHA256 of `"{timestamp}.{raw_body}"`. The header repeats `v1=` once
   * per currently valid secret so a rotation overlaps rather than cutting over.
   */
  parseWebhook(rawBody: string, signature: string | undefined): WebhookResult | null {
    if (!this.webhookSecret || !signature) return null;

    const parts = signature.split(',').map((p) => p.trim());
    const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
    const sent = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
    if (!timestamp || sent.length === 0) return null;

    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

    // timingSafeEqual throws on a length mismatch, so compare digests of equal
    // width and keep the comparison constant-time.
    const expectedBuf = Buffer.from(expected, 'hex');
    const ok = sent.some((candidate) => {
      const buf = Buffer.from(candidate, 'hex');
      return buf.length === expectedBuf.length && crypto.timingSafeEqual(buf, expectedBuf);
    });
    if (!ok) {
      logger.warn('Bachs webhook signature did not verify — ignoring');
      return null;
    }

    let event: WebhookEvent;
    try {
      event = JSON.parse(rawBody) as WebhookEvent;
    } catch {
      return null;
    }

    const checkoutId = event.data?.checkout_id;
    if (!checkoutId) return null;

    // We store checkout_id as the reference, so it is what settlePayment needs.
    switch (event.type) {
      case 'collection.succeeded':
        return { reference: checkoutId, status: 'PAID' };
      case 'collection.failed':
      case 'checkout.expired':
        return { reference: checkoutId, status: 'FAILED' };
      default:
        // Underpayments and every other event are deliberately not settled:
        // only a confirmed full collection releases a batch for drying.
        return null;
    }
  }
}
