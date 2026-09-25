"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import Switch from "@/components/ui/Switch";
import { Spinner } from "@/components/dashboard/States";
import { CheckIcon } from "@/components/icons";
import { useSettings, useUpdateSettings, type AppSettings } from "@/lib/hooks/useAdmin";
import { ApiError } from "@/lib/api";

/**
 * The master switch for drying fees.
 *
 * Off means nobody collects anywhere. On hands the decision to each hub, set
 * on the locations page — so a pilot hub can charge while the rest stay free.
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
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // No optimistic flip. A bad connection would show the switch in its new
  // position while the write was still in flight — or had failed — and the
  // admin would walk away believing hubs were charging when they were not.
  // The switch only moves once the server has confirmed the change.
  const feesEnabled = settings.feesEnabled;
  const busy = update.isPending;

  const onToggle = async (next: boolean) => {
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync({ feesEnabled: next });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save. Check your connection and try again."
      );
    }
  };

  return (
    <Card>
      <CardHeader title="Drying fees" />
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-dark">Collect drying fees</p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted">
              {feesEnabled
                ? "Each hub decides whether it charges. Drying waits for payment where it does."
                : "Drying runs free everywhere. Operators start batches without any payment."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {busy && <Spinner className="h-4 w-4 animate-spin text-brand" />}
            <Switch
              checked={feesEnabled}
              disabled={busy}
              onChange={onToggle}
              label="Collect drying fees"
            />
          </div>
        </div>

        {/* Confirmation of what actually landed in the database, not of the
            click. Saying so explicitly is the point: the admin needs to know
            the change is real before relying on it. */}
        {saved && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-brand">
            <CheckIcon className="h-4 w-4" />
            Saved. Fees are now {feesEnabled ? "on" : "off"} across the network.
          </p>
        )}

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {feesEnabled && (
          <p className="rounded-2xl bg-black/[0.02] px-4 py-3 text-sm leading-relaxed text-muted">
            Choose which hubs collect a fee on the{" "}
            <Link href="/admin/locations" className="font-medium text-brand hover:underline">
              locations page
            </Link>
            . A hub with fees off starts drying immediately, with no payment step.
          </p>
        )}
      </div>
    </Card>
  );
}
