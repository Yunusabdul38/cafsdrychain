import PageHeader from "@/components/dashboard/PageHeader";
import { StatGrid } from "@/components/dashboard/StatCard";
import ChainLedger from "@/components/dashboard/ChainLedger";
import { chainRecords } from "@/lib/mock-data";

export default function AuditorAudit() {
  const stats = [
    { label: "Records audited", value: String(chainRecords.length), hint: "confirmed" },
    { label: "Integrity", value: "100%", hint: "matches chain" },
    { label: "Flagged", value: "0", hint: "no anomalies" },
    { label: "Network", value: "Base", hint: "mainnet" },
  ];
  return (
    <>
      <PageHeader
        title="Audit trail"
        description="Independent, read-only view of every on-chain event."
      />
      <StatGrid stats={stats} />
      <div className="mt-6">
        <ChainLedger records={chainRecords} />
      </div>
    </>
  );
}
