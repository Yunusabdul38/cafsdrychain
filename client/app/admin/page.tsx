import Link from "next/link";
import PageHeader from "@/components/dashboard/PageHeader";
import { StatGrid } from "@/components/dashboard/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import BarList from "@/components/dashboard/BarList";
import ActivityFeed, {
  recentActivity,
} from "@/components/dashboard/ActivityFeed";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  batches,
  locations,
  metricsFor,
  STAGE_LABEL,
  STAGE_ORDER,
} from "@/lib/mock-data";
import { DownloadIcon } from "@/components/icons";

export default function AdminOverview() {
  const byStage = STAGE_ORDER.map((s) => ({
    label: STAGE_LABEL[s],
    value: batches.filter((b) => b.stage === s).length,
  }));

  return (
    <>
      <PageHeader
        title="Monitoring"
        description="Oversee every batch, hub, and on-chain record."
        action={
          <LinkButton href="/admin/reports" variant="outline">
            <DownloadIcon className="h-5 w-5" /> Reports
          </LinkButton>
        }
      />

      <StatGrid stats={metricsFor("admin")} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Batches by stage"
            action={
              <Link
                href="/admin/batches"
                className="text-xs font-semibold text-brand hover:underline"
              >
                View all
              </Link>
            }
          />
          <div className="p-5">
            <BarList bars={byStage} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Hub status"
            action={
              <Link
                href="/admin/locations"
                className="text-xs font-semibold text-brand hover:underline"
              >
                Manage
              </Link>
            }
          />
          <ul className="divide-y divide-black/[0.06]">
            {locations.map((loc) => (
              <li
                key={loc.name}
                className="flex items-center justify-between px-5 py-4"
              >
                <div>
                  <p className="font-medium text-brand-dark">{loc.name}</p>
                  <p className="text-xs text-muted">
                    {loc.batches} batches · {loc.active} drying now
                  </p>
                </div>
                {loc.batches > 0 ? (
                  <Badge className="bg-mint text-brand" dot="bg-brand">
                    Active
                  </Badge>
                ) : (
                  <Badge className="bg-black/[0.05] text-muted">Idle</Badge>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader
            title="Recent on-chain activity"
            action={
              <Link
                href="/admin/blockchain"
                className="text-xs font-semibold text-brand hover:underline"
              >
                View ledger
              </Link>
            }
          />
          <ActivityFeed items={recentActivity(7)} basePath="/admin/batches" />
        </Card>
      </div>
    </>
  );
}
