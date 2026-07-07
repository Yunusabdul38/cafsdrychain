import type { ChainRecord } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { relativeTime } from "@/lib/utils";

export default function ChainLedger({ records }: { records: ChainRecord[] }) {
  return (
    <>
      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {records.map((r) => (
          <li
            key={r.txHash}
            className="rounded-2xl border border-black/[0.08] bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-brand-dark">{r.action}</span>
              <Badge className="bg-mint text-brand" dot="bg-brand">
                {r.status}
              </Badge>
            </div>
            <p className="mt-1 font-mono text-xs text-brand">{r.batchId}</p>
            <p className="mt-1 break-all font-mono text-[11px] text-muted">
              {r.txHash}
            </p>
            <p className="mt-1 text-xs text-muted">
              Block {r.block.toLocaleString()} · {relativeTime(r.timestamp)}
            </p>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-black/[0.08] bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-medium">Tx hash</th>
              <th className="px-5 py-3 font-medium">Batch</th>
              <th className="px-5 py-3 font-medium">Action</th>
              <th className="px-5 py-3 font-medium">Actor</th>
              <th className="px-5 py-3 font-medium">Block</th>
              <th className="px-5 py-3 font-medium">Age</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr
                key={r.txHash}
                className="border-b border-black/[0.05] last:border-0 hover:bg-mint/40"
              >
                <td className="px-5 py-3.5 font-mono text-[13px] text-brand">
                  {r.txHash}
                </td>
                <td className="px-5 py-3.5 font-mono text-[13px] text-brand-dark">
                  {r.batchId}
                </td>
                <td className="px-5 py-3.5 text-brand-dark">{r.action}</td>
                <td className="px-5 py-3.5 text-muted">{r.actor}</td>
                <td className="px-5 py-3.5 text-muted">
                  {r.block.toLocaleString()}
                </td>
                <td className="px-5 py-3.5 text-muted">
                  {relativeTime(r.timestamp)}
                </td>
                <td className="px-5 py-3.5">
                  <Badge className="bg-mint text-brand" dot="bg-brand">
                    {r.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
