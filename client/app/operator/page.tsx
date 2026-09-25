"use client";

import { titleCase } from "@/lib/utils";
import Link from "next/link";
import { useMemo } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { StatGrid } from "@/components/dashboard/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { StageBadge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import { LoadingState, ErrorState, EmptyState } from "@/components/dashboard/States";
import { useBatches } from "@/lib/hooks/useBatches";
import { toUiBatches } from "@/lib/adapters";
import { operatorMetrics, recentActivity } from "@/lib/metrics";
import { nextAction, actionForBatch } from "@/lib/lifecycle";
import { ChevronRightIcon, PlusIcon, SunIcon, QrIcon } from "@/components/icons";

export default function OperatorOverview() {
  const { data, isLoading, isError, refetch } = useBatches();
  const batches = useMemo(() => (data ? toUiBatches(data) : []), [data]);
  const attention = batches.filter((b) => nextAction(b.stage) !== null);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Track and update every batch at your hub."
        action={
          <LinkButton href="/operator/register">
            <PlusIcon className="h-5 w-5" /> Register batch
          </LinkButton>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Couldn't load your batches." onRetry={() => refetch()} />
      ) : (
        <>
          <StatGrid stats={operatorMetrics(batches)} />

          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <QuickAction href="/operator/register" icon={<PlusIcon className="h-5 w-5" />} title="Register produce" sub="Start a new batch" />
            <QuickAction href="/operator/drying" icon={<SunIcon className="h-5 w-5" />} title="Drying updates" sub="Log progress" />
            <QuickAction href="/operator/batches" icon={<QrIcon className="h-5 w-5" />} title="All batches" sub="Browse & verify" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Needs attention"
                action={
                  <Link href="/operator/batches" className="text-xs font-semibold text-brand hover:underline">
                    View all
                  </Link>
                }
              />
              {attention.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted">
                  Nothing needs an update right now.
                </p>
              ) : (
                <ul className="divide-y divide-black/[0.06]">
                  {attention.map((b) => {
                    const action = actionForBatch(b)!;
                    return (
                      <li key={b.id}>
                        <Link
                          href={`/operator/batches/${b.id}/update`}
                          className="flex items-center gap-3 px-5 py-3.5 hover:bg-mint/40"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium text-brand-dark">{titleCase(b.product)}</span>
                              <StageBadge stage={b.stage} paid={b.payment?.status === "PAID"} />
                            </div>
                            <p className="mt-0.5 font-mono text-xs text-muted">{b.id}</p>
                          </div>
                          <span className="hidden shrink-0 text-sm font-semibold text-brand sm:block">
                            {action.label}
                          </span>
                          <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Recent activity" />
              {batches.length === 0 ? (
                <EmptyState title="No batches yet" description="Register your first batch to get started." />
              ) : (
                <ActivityFeed items={recentActivity(batches)} basePath="/operator/batches" />
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function QuickAction({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-2xl border border-black/[0.08] bg-white p-4 transition-colors hover:border-brand/40 hover:bg-mint/30"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-dark text-white">
        {icon}
      </span>
      <div>
        <p className="font-semibold text-brand-dark">{title}</p>
        <p className="text-xs text-muted">{sub}</p>
      </div>
    </Link>
  );
}
