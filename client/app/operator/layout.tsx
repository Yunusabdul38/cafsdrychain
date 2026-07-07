import DashboardShell from "@/components/dashboard/DashboardShell";

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell role="operator">{children}</DashboardShell>;
}
