import PageHeader from "@/components/dashboard/PageHeader";
import { StatGrid } from "@/components/dashboard/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import BarList from "@/components/dashboard/BarList";
import ReportActions from "@/components/admin/ReportActions";
import { batches } from "@/lib/mock-data";

export default function AuditorReports() {
  const bySource = Object.entries(
    batches.reduce<Record<string, number>>((acc, b) => {
      acc[b.sourceType] = (acc[b.sourceType] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([label, value]) => ({ label, value }));

  const stats = [
    { label: "Batches reviewed", value: String(batches.length), hint: "this period" },
    { label: "Compliant", value: `${batches.length}`, hint: "100%" },
    { label: "Non-compliant", value: "0", hint: "none" },
    { label: "Hubs", value: "2", hint: "audited" },
  ];

  return (
    <>
      <PageHeader
        title="Compliance reports"
        description="Generate traceability and compliance reports."
      />
      <StatGrid stats={stats} />

      <div className="mt-6">
        <Card className="p-5">
          <p className="text-sm font-semibold text-brand-dark">
            Compliance report
          </p>
          <p className="mb-4 mt-1 text-sm text-muted">
            Export an audit-ready traceability report for this period.
          </p>
          <ReportActions />
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader title="Batches by source type" />
          <div className="p-5">
            <BarList bars={bySource} />
          </div>
        </Card>
      </div>
    </>
  );
}
