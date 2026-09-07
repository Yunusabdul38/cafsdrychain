"use client";

import { useEffect, useRef, useState } from "react";
import type { Batch } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import Button, { LinkButton, buttonClass } from "@/components/ui/Button";
import PageHeader from "@/components/dashboard/PageHeader";
import { Spinner } from "@/components/dashboard/States";
import { CheckIcon, ClockIcon, LinkIcon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { batchSummary, titleCase } from "@/lib/utils";
import {
  useCreatePayment,
  useWaivePayment,
  usePayment,
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
  const minimumNaira = (settings?.minimumFee ?? 0) / 100;
  const { data: payment } = usePayment(batch.id, batch.stage === "awaiting-payment");
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
    if (minimumNaira > 0 && naira < minimumNaira) {
      setError(`The drying fee must be at least ${formatNaira(minimumNaira * 100)}.`);
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
              min={Math.max(1, minimumNaira)}
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
              {minimumNaira > 0 &&
                ` The minimum fee is ${formatNaira(minimumNaira * 100)}.`}
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

  return (
    <>
      <PageHeader
        title={paid ? "Payment received" : "Awaiting payment"}
        description={batchSummary(batch)}
        back={{ href: `${basePath}/${batch.id}`, label: titleCase(batch.product) }}
      />

      <Card className="mx-auto max-w-xl p-5 sm:p-7">
        <div className="text-center">
          <span
            className={
              "mx-auto flex h-14 w-14 items-center justify-center rounded-full " +
              (paid ? "bg-mint text-brand" : "bg-[#FFF3E0] text-[#B4740B]")
            }
          >
            {paid ? (
              <CheckIcon className="h-7 w-7" />
            ) : (
              <ClockIcon className="h-7 w-7" />
            )}
          </span>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-brand-dark">
            {formatNaira(live.amount)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {paid
              ? "This batch is paid for. You can start drying."
              : "Have the supplier scan this code or open the link to pay."}
          </p>
        </div>

        {!paid && (
          <>
            <div className="mt-6 flex flex-col items-center rounded-2xl border border-black/[0.08] bg-mint/40 p-6">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  live.checkoutUrl
                )}`}
                alt="Payment QR code"
                className="h-44 w-44 rounded-xl bg-white p-2"
              />
              <p className="mt-3 break-all text-center font-mono text-[11px] text-muted">
                {live.checkoutUrl}
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                full
                onClick={copyLink}
              >
                <LinkIcon className="h-4 w-4" /> {copied ? "Copied!" : "Copy link"}
              </Button>
              <a
                href={live.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass({ variant: "outline", full: true })}
              >
                Open payment page
              </a>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
              <Spinner className="h-4 w-4 animate-spin text-brand" />
              Waiting for payment confirmation…
            </div>

            {error && (
              <p className="mt-3 text-center text-sm text-red-600">{error}</p>
            )}
          </>
        )}

        {paid && (
          <div className="mt-6">
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
