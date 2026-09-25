"use client";

import { QRCodeSVG } from "qrcode.react";

import { useEffect, useRef, useState } from "react";
import type { Batch } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import Button, { LinkButton, buttonClass } from "@/components/ui/Button";
import PageHeader from "@/components/dashboard/PageHeader";
import { Spinner } from "@/components/dashboard/States";
import { CheckIcon, ClockIcon, ExternalLinkIcon, LinkIcon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { batchSummary, titleCase } from "@/lib/utils";
import {
  useCreatePayment,
  useWaivePayment,
  usePayment,
  useRefreshPayment,
  formatNaira,
} from "@/lib/hooks/usePayment";
import { useSettings } from "@/lib/hooks/useAdmin";

/**
 * The payment phase: the operator prices the drying, the app issues a link, and
 * the supplier pays on their own phone. Drying stays locked — server-side — until
 * the money is confirmed.
 */
export default function PaymentStep({
  batch,
  basePath,
}: {
  batch: Batch;
  basePath: string;
}) {
  const create = useCreatePayment(batch.id);
  const waive = useWaivePayment(batch.id);
  const waived = useRef(false);
  const { data: settings } = useSettings();
  const feesOff = settings?.feesEnabled === false;
  const { data: payment } = usePayment(batch.id, batch.stage === "awaiting-payment");
  const refresh = useRefreshPayment(batch.id);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const live = payment ?? batch.payment;

  const onSetFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const naira = Number(amount);
    if (!Number.isFinite(naira) || naira <= 0) {
      setError("Enter the drying fee in naira.");
      return;
    }
    if (!Number.isInteger(naira)) {
      setError("Enter a whole number of naira.");
      return;
    }
    try {
      await create.mutateAsync({ amount: naira });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create the payment link."
      );
    }
  };

  const copyLink = async () => {
    if (!live?.checkoutUrl) return;
    try {
      await navigator.clipboard.writeText(live.checkoutUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Press and hold the link to copy it manually.");
    }
  };

  // A batch registered before fees were switched off still sits on this step.
  // Settle it silently rather than asking the operator to confirm a zero fee.
  useEffect(() => {
    if (feesOff && !live && !waived.current) {
      waived.current = true;
      waive.mutateAsync().catch(() => {
        waived.current = false;
      });
    }
  }, [feesOff, live, waive]);

  if (feesOff) {
    return (
      <>
        <PageHeader
          title="Preparing batch"
          description={batchSummary(batch)}
          back={{ href: `${basePath}/${batch.id}`, label: titleCase(batch.product) }}
        />
        <Card className="mx-auto max-w-xl p-8 text-center">
          <p className="flex items-center justify-center gap-2 text-sm text-muted">
            <Spinner className="h-4 w-4 animate-spin text-brand" />
            No drying fee applies. Getting this batch ready…
          </p>
        </Card>
      </>
    );
  }

  // --- Step 1: price the drying -------------------------------------------
  if (batch.stage === "registered" || !live) {
    return (
      <>
        <PageHeader
          title="Set the drying fee"
          description={batchSummary(batch)}
          back={{ href: `${basePath}/${batch.id}`, label: titleCase(batch.product) }}
        />
        <Card className="mx-auto max-w-xl p-5 sm:p-7">
          <form onSubmit={onSetFee} className="space-y-4">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </div>
            )}
            <Input
              id="amount"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              label="Drying fee (₦)"
              placeholder="15000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
            <p className="text-sm text-muted">
              A payment link is created for this amount. Drying cannot start
              until the payment is confirmed.
            </p>
            <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
              <Button type="submit" full size="lg" disabled={create.isPending}>
                {create.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="h-5 w-5 animate-spin text-white" />
                    Creating link…
                  </span>
                ) : (
                  "Create payment link"
                )}
              </Button>
              <LinkButton
                href={`${basePath}/${batch.id}`}
                full
                size="lg"
                variant="outline"
              >
                Cancel
              </LinkButton>
            </div>
          </form>
        </Card>
      </>
    );
  }

  // --- Step 2: awaiting the supplier's payment ------------------------------
  const paid = live.status === "PAID";
  // An expired checkout is recorded as failed. Its link is dead, so offering
  // the QR again would send the supplier to a page that cannot take money.
  const dead = live.status === "FAILED";

  return (
    <>
      <PageHeader
        title={paid ? "Payment received" : "Awaiting payment"}
        description={batchSummary(batch)}
        back={{ href: `${basePath}/${batch.id}`, label: titleCase(batch.product) }}
      />

      <Card className="mx-auto max-w-xl overflow-hidden">
        {/* Headline band: the amount and where the batch stands, in one look. */}
        <div
          className={
            "px-6 py-7 text-center " + (paid ? "bg-mint/50" : "bg-[#FFF3E0]")
          }
        >
          <span
            className={
              "mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full " +
              (paid ? "bg-brand text-white" : "bg-white text-[#B4740B]")
            }
          >
            {paid ? <CheckIcon className="h-6 w-6" /> : <ClockIcon className="h-6 w-6" />}
          </span>
          {/* The page title already says which state this is, and the colour
              repeats it — so this names the amount rather than saying it again. */}
          <p
            className={
              "text-xs font-semibold uppercase tracking-wider " +
              (paid ? "text-brand" : "text-[#B4740B]")
            }
          >
            Drying fee
          </p>
          <p className="mt-1.5 text-4xl font-semibold tracking-tight text-brand-dark">
            {formatNaira(live.amount)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {titleCase(batch.product)} · {titleCase(batch.location)}
          </p>
        </div>

        {dead && (
          <div className="border-y border-black/[0.06] px-6 py-7 text-center">
            <p className="text-sm font-medium text-brand-dark">
              This payment link is no longer usable
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              It expired or the payment did not go through. Set the fee again to
              issue a fresh link — or if the supplier has already transferred,
              check below before doing so.
            </p>
          </div>
        )}

        {!paid && !dead && (
          <>
            {/* The code is the main event: an operator holds the screen out and
                the supplier scans it. The URL itself is never shown — it is long,
                unreadable, and nobody types a gateway link by hand. */}
            <div className="flex flex-col items-center border-y border-black/[0.06] px-6 py-7">
              <div className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm">
                <QRCodeSVG value={live.checkoutUrl} size={176} level="M" marginSize={0} />
              </div>
              <p className="mt-4 text-sm font-medium text-brand-dark">
                Ask the supplier to scan this code
              </p>
              <p className="mt-1 text-center text-xs leading-relaxed text-muted">
                They can pay by bank transfer from their own phone. Or send them
                the link instead.
              </p>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" full onClick={copyLink}>
                  <LinkIcon className="h-4 w-4" /> {copied ? "Link copied" : "Copy link"}
                </Button>
                <a
                  href={live.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass({ variant: "outline", full: true })}
                >
                  <ExternalLinkIcon className="h-4 w-4" /> Open page
                </a>
              </div>

            </div>
          </>
        )}

        {!paid && (
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            {/* Status reports; it is not a thing to press. Shown for a dead
                link too — that is precisely when a transfer may have landed
                after the checkout closed, and asking the gateway is the only
                way to find out. */}
            <div className="rounded-2xl bg-black/[0.02] px-4 py-3.5">
              {!dead && (
                <p className="flex items-center justify-center gap-2 text-sm text-muted">
                  <Spinner className="h-4 w-4 animate-spin text-brand" />
                  Waiting for payment confirmation…
                </p>
              )}
              <button
                type="button"
                disabled={refresh.isPending}
                onClick={() => refresh.mutate()}
                className={
                  "w-full text-center text-xs font-medium text-brand transition-colors hover:text-brand-dark disabled:opacity-50" +
                  (dead ? "" : " mt-1.5")
                }
              >
                {refresh.isPending
                  ? "Checking with the gateway…"
                  : "Supplier says they paid? Check now"}
              </button>
            </div>

            {error && (
              <p className="mt-3 text-center text-sm text-red-600">{error}</p>
            )}
          </div>
        )}

        {paid && (
          <div className="p-5 sm:p-6">
            <p className="mb-4 text-center text-sm leading-relaxed text-muted">
              This batch is paid for and cleared to dry.
            </p>
            <LinkButton
              href={`${basePath}/${batch.id}/update`}
              full
              size="lg"
              variant="dark"
            >
              Start drying
            </LinkButton>
          </div>
        )}
      </Card>
    </>
  );
}
