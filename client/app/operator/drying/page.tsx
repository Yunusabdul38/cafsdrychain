import Link from "next/link";
import PageHeader from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/Card";
import { StageBadge } from "@/components/ui/Badge";
import { batches } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { nextAction } from "@/lib/lifecycle";
import { ChevronRightIcon, SunIcon } from "@/components/icons";

export default function DryingPage() {
  const toStart = batches.filter((b) => b.stage === "registered");
  const active = batches.filter((b) => b.stage === "drying");

  return (
    <>
      <PageHeader
        title="Drying"
        description="Start and complete drying for batches at your hub."
      />

      <Section
        title="Ready to start"
        empty="No batches waiting to start drying."
        batches={toStart}
      />
      <div className="h-6" />
      <Section
        title="Currently drying"
        empty="No batches are drying right now."
        batches={active}
      />
    </>
  );
}

function Section({
  title,
  empty,
  batches,
}: {
  title: string;
  empty: string;
  batches: typeof import("@/lib/mock-data").batches;
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      {batches.length === 0 ? (
        <Card className="px-5 py-10 text-center text-sm text-muted">
          {empty}
        </Card>
      ) : (
        <ul className="space-y-3">
          {batches.map((b) => {
            const action = nextAction(b.stage)!;
            return (
              <li key={b.id}>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mint text-brand">
                      <SunIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-brand-dark">
                          {b.product}
                        </span>
                        <StageBadge stage={b.stage} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        <span className="font-mono">{b.id}</span> ·{" "}
                        {b.freshWeight} kg · in {formatDate(b.deliveryDate)}
                      </p>
                    </div>
                    <Link
                      href={`/operator/batches/${b.id}/update`}
                      className="hidden shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover sm:block"
                    >
                      {action.label}
                    </Link>
                    <Link
                      href={`/operator/batches/${b.id}/update`}
                      className="shrink-0 text-muted sm:hidden"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </Link>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
