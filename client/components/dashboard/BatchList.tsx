"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Batch } from "@/lib/types";
import { StageBadge } from "@/components/ui/Badge";
import { formatDate, titleCase } from "@/lib/utils";

export default function BatchList({
  batches,
  basePath,
  showOperator = false,
  showLocation = false,
}: {
  batches: Batch[];
  basePath: string;
  showOperator?: boolean;
  showLocation?: boolean;
}) {
  const router = useRouter();

  /**
   * The whole row opens the batch. A <tr> cannot be wrapped in a link, so the
   * row handles the click and keeps a link's behaviour: Cmd/Ctrl- and
   * middle-click open a new tab, selecting text does not navigate, and the
   * Batch ID stays a real link for keyboard users.
   */
  const openRow = (e: React.MouseEvent, href: string) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    if (window.getSelection()?.toString()) return;
    if (e.metaKey || e.ctrlKey || e.button === 1) window.open(href, "_blank");
    else router.push(href);
  };

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
                    {titleCase(b.product)}
                  </span>
                  <StageBadge stage={b.stage} paid={b.payment?.status === "PAID"} />
                </div>
                <p className="mt-1 font-mono text-xs text-muted">{b.id}</p>
                {/* Keep in step with the desktop table below: a batch should
                    not read differently depending on the screen. */}
                <p className="mt-1 text-xs text-muted">
                  {titleCase(b.source)} · {b.finalWeight ?? b.freshWeight} kg{" "}
                  {b.finalWeight !== undefined ? "dried" : "fresh"}
                  {showOperator ? ` · ${b.operator}` : ""}
                  {showLocation ? ` · ${titleCase(b.location)}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Entered {formatDate(b.entryDate)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-black/[0.08] bg-white md:block">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-medium">Batch ID</th>
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-5 py-3 font-medium">Source</th>
              {showOperator && (
                <th className="px-5 py-3 font-medium">Operator</th>
              )}
              {showLocation && (
                <th className="px-5 py-3 font-medium">Facility</th>
              )}
              <th className="px-5 py-3 font-medium">Weight</th>
              <th className="px-5 py-3 font-medium">Entered</th>
              <th className="px-5 py-3 font-medium">Stage</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr
                key={b.id}
                onClick={(e) => openRow(e, `${basePath}/${b.id}`)}
                onAuxClick={(e) => e.button === 1 && openRow(e, `${basePath}/${b.id}`)}
                className="cursor-pointer border-b border-black/[0.05] last:border-0 hover:bg-mint/40"
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
                  {titleCase(b.product)}
                </td>
                <td className="px-5 py-3.5 text-muted">{titleCase(b.source)}</td>
                {showOperator && (
                  <td className="px-5 py-3.5 text-muted">{b.operator}</td>
                )}
                {showLocation && (
                  <td className="px-5 py-3.5 text-muted">{titleCase(b.location)}</td>
                )}
                <td className="px-5 py-3.5">
                  <span className="font-medium text-brand-dark">
                    {b.finalWeight ?? b.freshWeight} kg
                  </span>
                  <span className="ml-1.5 text-xs text-muted">
                    {b.finalWeight !== undefined ? "dried" : "fresh"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-muted">
                  {formatDate(b.entryDate)}
                </td>
                <td className="px-5 py-3.5">
                  <StageBadge stage={b.stage} paid={b.payment?.status === "PAID"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
