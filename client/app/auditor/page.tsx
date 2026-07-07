import Link from "next/link";
import PageHeader from "@/components/dashboard/PageHeader";
import { StatGrid } from "@/components/dashboard/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import ActivityFeed, {
  recentActivity,
} from "@/components/dashboard/ActivityFeed";
import { LinkButton } from "@/components/ui/Button";
import { batches, metricsFor } from "@/lib/mock-data";
import { ShieldIcon, QrIcon } from "@/components/icons";

export default function AuditorOverview() {
  const verified = batches.filter((b) => b.verified).length;

  return (
    <>
      <PageHeader
        title="Audit overview"
        description="Independent verification of the drying supply chain."
        action={
          <LinkButton href="/auditor/verify">
            <QrIcon className="h-5 w-5" /> Verify batch
          </LinkButton>
        }
      />

      <StatGrid stats={metricsFor("auditor")} />

      {/* Integrity banner (flat) */}
      <div className="mt-4 flex items-center gap-4 rounded-2xl border border-black/[0.08] bg-mint/50 p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white">
          <ShieldIcon className="h-6 w-6" />
        </span>
        <div>
          <p className="font-semibold text-brand-dark">
            All records verified — no anomalies detected
          </p>
          <p className="text-sm text-muted">
            {verified} of {batches.length} batches match their on-chain history.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent verifications"
            action={
              <Link
                href="/auditor/audit"
                className="text-xs font-semibold text-brand hover:underline"
              >
                Audit trail
              </Link>
            }
          />
          <ActivityFeed items={recentActivity(6)} basePath="/auditor/batches" />
        </Card>

        <Card className="p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-dark text-white">
            <QrIcon className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-lg font-semibold text-brand-dark">
            Verify a product
          </h3>
          <p className="mt-1 text-sm text-muted">
            Scan a QR code or enter a Batch ID to inspect its complete,
            tamper-resistant history.
          </p>
          <div className="mt-4">
            <LinkButton href="/auditor/verify" variant="dark">
              Open verification
            </LinkButton>
          </div>
        </Card>
      </div>
    </>
  );
}
