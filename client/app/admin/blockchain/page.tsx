import PageHeader from "@/components/dashboard/PageHeader";
import { StatGrid } from "@/components/dashboard/StatCard";
import ChainLedger from "@/components/dashboard/ChainLedger";
import { chainRecords } from "@/lib/mock-data";

export default function AdminBlockchain() {
  const stats = [
    { label: "Total records", value: String(chainRecords.length), hint: "all confirmed" },
    { label: "Network", value: "Base", hint: "mainnet" },
    { label: "Pending", value: "0", hint: "no queue" },
    { label: "Anomalies", value: "0", hint: "integrity ok" },
  ];
  return (
    <>
      <PageHeader
        title="Blockchain ledger"
        description="Every batch event, permanently recorded on Base."
      />
      <StatGrid stats={stats} />
      <div className="mt-6">
        <ChainLedger records={chainRecords} />
      </div>
    </>
  );
}
