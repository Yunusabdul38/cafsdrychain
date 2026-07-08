"use client";

import PageHeader from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { LoadingState, ErrorState, EmptyState } from "@/components/dashboard/States";
import { useUsers, type ApiUser } from "@/lib/hooks/useUsers";
import { formatDate } from "@/lib/utils";
import { PlusIcon, UsersIcon } from "@/components/icons";

const roleLabel: Record<string, string> = {
  operator: "Operator",
  admin: "Administrator",
};

const initials = (name: string) =>
  name.split(" ").map((n) => n[0]).slice(0, 2).join("");

export default function AdminOperators() {
  const { data: users, isLoading, isError, refetch } = useUsers();

  return (
    <>
      <PageHeader
        title="Users"
        description="Provision and manage operator and admin accounts."
        action={
          <LinkButton href="/admin/operators/new">
            <PlusIcon className="h-5 w-5" /> Add user
          </LinkButton>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Couldn't load users." onRetry={() => refetch()} />
      ) : !users || users.length === 0 ? (
        <EmptyState
          icon={<UsersIcon className="h-6 w-6" />}
          title="No users yet"
          description="Add your first operator or admin."
          action={<LinkButton href="/admin/operators/new">Add user</LinkButton>}
        />
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {users.map((u) => (
              <li key={u.id}>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint text-xs font-semibold text-brand">
                      {initials(u.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-brand-dark">{u.name}</p>
                      <p className="truncate text-xs text-muted">{u.email}</p>
                    </div>
                    <StatusPill status={u.status} />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                    <Badge className="bg-sky-soft text-sky">{roleLabel[u.role] ?? u.role}</Badge>
                    <span>{u.location ?? "—"}</span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-black/[0.08] bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium">Wallet</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-black/[0.05] last:border-0 hover:bg-mint/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint text-[11px] font-semibold text-brand">
                          {initials(u.name)}
                        </span>
                        <div>
                          <p className="font-medium text-brand-dark">{u.name}</p>
                          <p className="text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge className="bg-sky-soft text-sky">{roleLabel[u.role] ?? u.role}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-muted">{u.location ?? "—"}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted">
                      {u.wallet ? `${u.wallet.address.slice(0, 6)}…${u.wallet.address.slice(-4)}` : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-muted">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <StatusPill status={u.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function StatusPill({ status }: { status: ApiUser["status"] }) {
  return status === "ACTIVE" ? (
    <Badge className="bg-mint text-brand" dot="bg-brand">Active</Badge>
  ) : (
    <Badge className="bg-black/[0.05] text-muted" dot="bg-muted">Inactive</Badge>
  );
}
