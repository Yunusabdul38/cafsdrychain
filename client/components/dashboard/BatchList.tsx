import Link from "next/link";
import type { Batch } from "@/lib/types";
import { StageBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { ChevronRightIcon } from "@/components/icons";

export default function BatchList({
  batches,
  basePath,
  showOperator = false,
}: {
  batches: Batch[];
  basePath: string;
  showOperator?: boolean;
}) {
  if (batches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/[0.12] bg-white px-6 py-14 text-center">
        <p className="text-sm font-medium text-brand-dark">No batches found</p>
        <p className="mt-1 text-sm text-muted">
          Batches will appear here once registered.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: cards */}
      <ul className="space-y-3 md:hidden">
        {batches.map((b) => (
          <li key={b.id}>
            <Link
              href={`${basePath}/${b.id}`}
              className="flex items-center gap-3 rounded-2xl border border-black/[0.08] bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-brand-dark">
                    {b.product}
                  </span>
                  <StageBadge stage={b.stage} />
                </div>
                <p className="mt-1 font-mono text-xs text-muted">{b.id}</p>
                <p className="mt-1 text-xs text-muted">
                  {b.source} · {b.freshWeight} kg
                  {showOperator ? ` · ${b.operator}` : ""}
                </p>
              </div>
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-2xl border border-black/[0.08] bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-medium">Batch ID</th>
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-5 py-3 font-medium">Source</th>
              {showOperator && (
                <th className="px-5 py-3 font-medium">Operator</th>
              )}
              <th className="px-5 py-3 font-medium">Weight</th>
              <th className="px-5 py-3 font-medium">Delivered</th>
              <th className="px-5 py-3 font-medium">Stage</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr
                key={b.id}
                className="border-b border-black/[0.05] last:border-0 hover:bg-mint/40"
              >
                <td className="px-5 py-3.5">
                  <Link
                    href={`${basePath}/${b.id}`}
                    className="font-mono text-[13px] font-medium text-brand hover:underline"
                  >
                    {b.id}
                  </Link>
                </td>
                <td className="px-5 py-3.5 font-medium text-brand-dark">
                  {b.product}
                </td>
                <td className="px-5 py-3.5 text-muted">{b.source}</td>
                {showOperator && (
                  <td className="px-5 py-3.5 text-muted">{b.operator}</td>
                )}
                <td className="px-5 py-3.5 text-muted">{b.freshWeight} kg</td>
                <td className="px-5 py-3.5 text-muted">
                  {formatDate(b.deliveryDate)}
                </td>
                <td className="px-5 py-3.5">
                  <StageBadge stage={b.stage} />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`${basePath}/${b.id}`}
                    className="text-muted hover:text-brand-dark"
                  >
                    <ChevronRightIcon className="ml-auto h-5 w-5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
