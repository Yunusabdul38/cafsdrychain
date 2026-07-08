import { Badge } from "@/components/ui/Badge";
import { relativeTime } from "@/lib/utils";

export type LedgerRecord = {
  id: string;
  txHash: string;
  batchId: string;
  action: string;
  actor: string;
  timestamp: string;
  status: "confirmed" | "pending" | "failed";
};

const EXPLORER_TX = "https://sepolia.basescan.org/tx/";

function statusBadge(status: LedgerRecord["status"]) {
  if (status === "confirmed")
    return <Badge className="bg-mint text-brand" dot="bg-brand">Confirmed</Badge>;
  if (status === "failed")
    return <Badge className="bg-red-50 text-red-600" dot="bg-red-500">Failed</Badge>;
  return <Badge className="bg-[#FFF3E0] text-[#B4740B]" dot="bg-[#B4740B]">Pending</Badge>;
}

function TxLink({ hash }: { hash: string }) {
  if (!hash) return <span className="text-muted">—</span>;
  const short = `${hash.slice(0, 10)}…${hash.slice(-6)}`;
  return (
    <a
      href={`${EXPLORER_TX}${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-[13px] text-brand hover:underline"
    >
      {short}
    </a>
  );
}

export default function ChainLedger({ records }: { records: LedgerRecord[] }) {
  return (
    <>
      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {records.map((r) => (
          <li key={r.id} className="rounded-2xl border border-black/[0.08] bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-brand-dark">{r.action}</span>
              {statusBadge(r.status)}
            </div>
            <p className="mt-1 font-mono text-xs text-brand">{r.batchId}</p>
            <p className="mt-1 break-all text-[11px]">
              <TxLink hash={r.txHash} />
            </p>
            <p className="mt-1 text-xs text-muted">
              {r.actor} · {relativeTime(r.timestamp)}
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
              <th className="px-5 py-3 font-medium">Age</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-black/[0.05] last:border-0 hover:bg-mint/40">
                <td className="px-5 py-3.5"><TxLink hash={r.txHash} /></td>
                <td className="px-5 py-3.5 font-mono text-[13px] text-brand-dark">{r.batchId}</td>
                <td className="px-5 py-3.5 text-brand-dark">{r.action}</td>
                <td className="px-5 py-3.5 text-muted">{r.actor}</td>
                <td className="px-5 py-3.5 text-muted">{relativeTime(r.timestamp)}</td>
                <td className="px-5 py-3.5">{statusBadge(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
