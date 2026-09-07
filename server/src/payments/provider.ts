/**
 * The seam between the app and whichever payment gateway is in use.
 *
 * Nothing outside this folder knows about a specific provider: the batch
 * lifecycle only ever asks "is this reference paid?". Adding Paystack or
 * Flutterwave later means writing one more file that satisfies this interface
 * and registering it in `index.ts` — no changes to the lifecycle, the routes,
 * or the UI.
 */

export type PaymentState = 'PENDING' | 'PAID' | 'FAILED';

export type CreateLinkInput = {
  /** Human batch id (DRY-2K7F-9X1), shown to the payer and used as reference. */
  batchId: string;
  /** Minor units — kobo for NGN. Always an integer. */
  amount: number;
  currency: string;
  description: string;
};

export type CreateLinkResult = {
  /** Provider-side id used to reconcile webhooks. Must be unique. */
  reference: string;
  /** The hosted page the payer opens. This is the "payment link". */
  checkoutUrl: string;
};

export type WebhookResult = {
  reference: string;
  status: PaymentState;
};

export interface PaymentProvider {
  readonly name: string;

  /** Create a hosted checkout and return its link. */
  createLink(input: CreateLinkInput): Promise<CreateLinkResult>;

  /**
   * Ask the provider what really happened. This is the source of truth —
   * a browser redirect back from checkout is never treated as proof of payment.
   */
  verify(reference: string): Promise<PaymentState>;

  /**
   * Authenticate an inbound webhook and extract its outcome. Returns null when
   * the signature does not check out, so a forged call cannot mark a batch paid.
   */
  parseWebhook(rawBody: string, signature: string | undefined): WebhookResult | null;
}
