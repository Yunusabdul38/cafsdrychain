"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/dashboard/States";
import { CheckIcon } from "@/components/icons";
import { useSettings, useUpdateSettings, type AppSettings } from "@/lib/hooks/useAdmin";
import { formatNaira } from "@/lib/hooks/usePayment";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Admin control over drying fees: whether they are collected at all, and the
 * floor an operator may charge when they are.
 */
export default function PaymentSettingsCard() {
  const { data: settings, isLoading } = useSettings();

  if (isLoading || !settings) {
    return (
      <Card>
        <CardHeader title="Drying fees" />
        <div className="flex items-center gap-2 p-5 text-sm text-muted">
          <Spinner className="h-4 w-4 animate-spin text-brand" /> Loading…
        </div>
      </Card>
    );
  }

  return <PaymentSettingsForm settings={settings} />;
}

function PaymentSettingsForm({ settings }: { settings: AppSettings }) {
  const update = useUpdateSettings();

  const [feesEnabled, setFeesEnabled] = useState(settings.feesEnabled);
  const [minimum, setMinimum] = useState(String(settings.minimumFee / 100));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const naira = Number(minimum);
    if (!Number.isInteger(naira) || naira < 0) {
      setError("Enter a whole number of naira, or 0 for no minimum.");
      return;
    }
    try {
      await update.mutateAsync({ feesEnabled, minimumFee: naira });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the settings.");
    }
  };

  return (
    <Card>
      <CardHeader title="Drying fees" />
      <form onSubmit={onSave} className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-dark">Collect drying fees</p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted">
              {feesEnabled
                ? "Operators set a fee per batch and drying waits for payment."
                : "Drying runs free. Operators start batches without any payment."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={feesEnabled}
            aria-label="Collect drying fees"
            onClick={() => setFeesEnabled((v) => !v)}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
              feesEnabled ? "bg-brand" : "bg-black/[0.15]"
            )}
          >
            <span
              className={cn(
                "absolute top-1 h-5 w-5 rounded-full bg-white transition-all",
                feesEnabled ? "left-6" : "left-1"
              )}
            />
          </button>
        </div>

        <div className={cn(!feesEnabled && "opacity-50")}>
          <Input
            id="minimumFee"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            label="Minimum fee (₦)"
            placeholder="0"
            value={minimum}
            disabled={!feesEnabled}
            onChange={(e) => setMinimum(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-muted">
            {Number(minimum) > 0
              ? `Operators cannot charge less than ${formatNaira(Number(minimum) * 100)} per batch.`
              : "No minimum. Operators may charge any amount above zero."}
          </p>
        </div>

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
              <CheckIcon className="h-4 w-4" /> Saved
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
