import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { relativeTime } from "@/lib/utils";

export type LedgerRecord = {
  id: string;
  txHash: string;
  batchId: string;
  action: string;
  actor: string;
  timestamp: string;
  status: "confirmed" | "pending" | "failed";
  location: string;
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
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  const uniqueLocations = useMemo(() => {
    const locs = new Set<string>();
    records.forEach((r) => r.location && locs.add(r.location));
    return Array.from(locs).sort();
  }, [records]);

  const filtered = useMemo(() => {
    if (selectedLocation === "all") return records;
    return records.filter((r) => r.location === selectedLocation);
  }, [records, selectedLocation]);

  return (
    <div className="space-y-4">
      {uniqueLocations.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-black/[0.08] bg-white px-5 py-3">
          <p className="text-sm font-semibold text-brand-dark">Filter by location</p>
          <div className="w-48 sm:w-64">
            <Select
              id="ledger-location-filter"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="h-10 text-xs"
            >
              <option value="all">All Locations</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {filtered.map((r) => (
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
              {r.actor} · {r.location} · {relativeTime(r.timestamp)}
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
              <th className="px-5 py-3 font-medium">Facility</th>
              <th className="px-5 py-3 font-medium">Actor</th>
              <th className="px-5 py-3 font-medium">Age</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-black/[0.05] last:border-0 hover:bg-mint/40">
                <td className="px-5 py-3.5"><TxLink hash={r.txHash} /></td>
                <td className="px-5 py-3.5 font-mono text-[13px] text-brand-dark">{r.batchId}</td>
                <td className="px-5 py-3.5 text-brand-dark">{r.action}</td>
                <td className="px-5 py-3.5 text-muted">{r.location}</td>
                <td className="px-5 py-3.5 text-muted">{r.actor}</td>
                <td className="px-5 py-3.5 text-muted">{relativeTime(r.timestamp)}</td>
                <td className="px-5 py-3.5">{statusBadge(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

