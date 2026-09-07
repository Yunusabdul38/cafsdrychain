"use client";

import DetailRow from "@/components/ui/DetailRow";
import { titleCase, formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import { LoadingState } from "@/components/dashboard/States";
import { CheckIcon, CloseIcon, ShieldIcon } from "@/components/icons";
import {
  usePublicPayment,
  useSimulatePayment,
  formatNaira,
} from "@/lib/hooks/usePayment";

/**
 * The page a supplier lands on from the payment link.
 *
 * While the stub gateway is in use this stands in for a hosted checkout, with
 * buttons that settle the payment by hand. Swapping in a real provider replaces
 * the action below with a redirect to their hosted page — the surrounding
 * receipt, and the server-side gate on drying, stay exactly as they are.
 */
export default function CheckoutLive({ reference }: { reference: string }) {
  const { data: payment, isLoading, isError } = usePublicPayment(reference);
  const simulate = useSimulatePayment(reference);
  const paid = payment?.status === "PAID";

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f8f4]">
      <header className="border-b border-black/[0.08] bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {isLoading ? (
            <Card className="p-8">
              <LoadingState label="Loading payment…" />
            </Card>
          ) : isError || !payment ? (
            <Card className="p-8 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
                <CloseIcon className="h-7 w-7" />
              </span>
              <h1 className="mt-4 text-xl font-semibold text-brand-dark">
                Payment not found
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                This payment link is invalid or has expired. Ask the operator at
                the drying hub for a new one.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              {/* The amount is the one thing that must be unmissable */}
              <div
                className={
                  "px-6 py-7 text-center " + (paid ? "bg-mint/50" : "bg-mint/30")
                }
              >
                {paid && (
                  <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white">
                    <CheckIcon className="h-6 w-6" />
                  </span>
                )}
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                  {paid ? "Payment complete" : "Drying fee"}
                </p>
                <p className="mt-1.5 text-4xl font-semibold tracking-tight text-brand-dark">
                  {formatNaira(payment.amount)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {payment.currency} · {titleCase(payment.batch.product)}
                </p>
              </div>

              {/* What is being paid for */}
              <dl className="divide-y divide-black/[0.06] border-y border-black/[0.06]">
                <DetailRow hideWhenEmpty label="Product" value={titleCase(payment.batch.product)} />
                <DetailRow hideWhenEmpty label="Drying hub" value={titleCase(payment.batch.location)} />
                <DetailRow hideWhenEmpty label="Batch" value={payment.batch.batchId} />
                {paid && payment.paidAt && (
                  <DetailRow hideWhenEmpty label="Paid on" value={formatDateTime(payment.paidAt)} />
                )}
              </dl>

              <div className="p-5 sm:p-6">
                {paid ? (
                  <p className="text-center text-sm leading-relaxed text-muted">
                    Drying can now begin. You can close this page.
                  </p>
                ) : (
                  <>
                    {payment.status === "FAILED" && (
                      <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        The last attempt did not go through. You can try again.
                      </div>
                    )}

                    {payment.provider === "stub" && (
                      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
                        <span className="font-semibold">Test mode.</span> No
                        payment gateway is connected yet, so this button settles
                        the payment immediately without charging anything.
                      </div>
                    )}

                    <Button
                      full
                      size="lg"
                      variant="dark"
                      disabled={simulate.isPending}
                      onClick={() => simulate.mutate({ outcome: "PAID" })}
                    >
                      {simulate.isPending
                        ? "Confirming…"
                        : `Pay ${formatNaira(payment.amount)}`}
                    </Button>

                    {payment.provider === "stub" && (
                      <button
                        type="button"
                        disabled={simulate.isPending}
                        onClick={() => simulate.mutate({ outcome: "FAILED" })}
                        className="mt-3 w-full text-center text-xs font-medium text-muted transition-colors hover:text-brand-dark disabled:opacity-50"
                      >
                        Simulate a failed payment
                      </button>
                    )}
                  </>
                )}
              </div>
            </Card>
          )}

          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted">
            <ShieldIcon className="h-3.5 w-3.5 text-brand" />
            Payment for a batch recorded on the blockchain
          </p>
        </div>
      </main>

      <footer className="border-t border-black/[0.08] bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 text-center text-sm text-muted sm:px-6">
          © {new Date().getFullYear()} CAFS DryChain · Secured on chain
        </div>
      </footer>
    </div>
  );
}
