import DashboardShell from "@/components/dashboard/DashboardShell";

export default function AuditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell role="auditor">{children}</DashboardShell>;
}
