"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { LoadingState, ErrorState, EmptyState } from "@/components/dashboard/States";
import { useUsers, useUpdateUserStatus, useDeleteUser, type ApiUser } from "@/lib/hooks/useUsers";
import { formatDate } from "@/lib/utils";
import { PlusIcon, UsersIcon, TrashIcon, CloseIcon, MoreVerticalIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const roleLabel: Record<string, string> = {
  operator: "Operator",
  admin: "Administrator",
};

const initials = (name: string) =>
  name.split(" ").map((n) => n[0]).slice(0, 2).join("");

export default function AdminOperators() {
  const { data: users, isLoading, isError, refetch } = useUsers();
  const updateStatus = useUpdateUserStatus();
  const deleteUserMutation = useDeleteUser();

  const [confirmingDeleteUser, setConfirmingDeleteUser] = useState<ApiUser | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteResultMsg, setDeleteResultMsg] = useState<string | null>(null);
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);

  useEffect(() => {
    function handleDocumentClick() {
      setActiveMenuUserId(null);
    }
    if (activeMenuUserId) {
      document.addEventListener("click", handleDocumentClick);
    }
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [activeMenuUserId]);

  const handleToggleStatus = async (id: string, currentStatus: "ACTIVE" | "INACTIVE") => {
    try {
      await updateStatus.mutateAsync({
        id,
        status: currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmingDeleteUser) return;
    setDeleteError(null);
    try {
      const res = await deleteUserMutation.mutateAsync(confirmingDeleteUser.id);
      if (res.deleted) {
        setConfirmingDeleteUser(null);
      } else {
        setDeleteResultMsg(res.message);
      }
    } catch (err) {
      setDeleteError("Failed to delete user. Please try again.");
    }
  };

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
                  <div className="mt-3 flex items-center justify-between border-t border-black/[0.04] pt-3">
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Badge className="bg-sky-soft text-sky">{roleLabel[u.role] ?? u.role}</Badge>
                      <span>{u.location ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleStatus(u.id, u.status)}
                        className="text-xs font-semibold text-brand hover:underline"
                        disabled={updateStatus.isPending}
                      >
                        {u.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteUser(u)}
                        className="text-muted hover:text-red-600 p-1"
                        title="Delete User"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
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
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
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
                    <td className="px-5 py-3.5 text-right relative">
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuUserId(activeMenuUserId === u.id ? null : u.id);
                          }}
                          className="p-1.5 rounded-full hover:bg-black/[0.04] text-muted hover:text-brand-dark transition-colors"
                          title="Actions"
                        >
                          <MoreVerticalIcon className="h-5 w-5" />
                        </button>

                        {activeMenuUserId === u.id && (
                          <div className="absolute right-5 top-11 z-20 w-36 rounded-xl border border-black/[0.08] bg-white shadow-lg py-1 animate-in fade-in slide-in-from-top-1 duration-150 text-left">
                            <button
                              onClick={() => {
                                handleToggleStatus(u.id, u.status);
                                setActiveMenuUserId(null);
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-brand-dark hover:bg-black/[0.03] transition-colors"
                              disabled={updateStatus.isPending}
                            >
                              {u.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => {
                                setConfirmingDeleteUser(u);
                                setActiveMenuUserId(null);
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors border-t border-black/[0.04]"
                            >
                              Delete account
                            </button>
                          </div>
                        )}
                      </div>
                    </td>                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {confirmingDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 relative bg-white shadow-xl animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => {
                setConfirmingDeleteUser(null);
                setDeleteResultMsg(null);
                setDeleteError(null);
              }}
              className="absolute right-4 top-4 text-muted hover:text-brand-dark"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold text-brand-dark">Delete user account</h3>
            
            {deleteResultMsg ? (
              <div className="mt-4">
                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-850">
                  <p className="font-semibold text-yellow-800">Notice</p>
                  <p className="mt-1 text-xs leading-relaxed text-yellow-700">{deleteResultMsg}</p>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setConfirmingDeleteUser(null);
                      setDeleteResultMsg(null);
                      setDeleteError(null);
                    }}
                    className="w-full rounded-2xl bg-brand-dark text-white font-semibold py-2.5 hover:bg-brand-dark/90 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="mt-2 text-sm text-muted">
                  Are you sure you want to delete <strong>{confirmingDeleteUser.name}</strong> ({confirmingDeleteUser.email})?
                </p>
                <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50/50 p-3 text-xs text-yellow-800 leading-relaxed">
                  <strong>Important:</strong> To maintain system integrity and historical traceability, any batch records registered by this user on the blockchain will be preserved forever. If they have active or completed batches, their account will be deactivated instead of fully deleted.
                </div>
                {deleteError && (
                  <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-600">
                    {deleteError}
                  </div>
                )}
                <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleteUserMutation.isPending}
                    className="w-full sm:w-auto rounded-2xl bg-red-600 text-white font-semibold px-5 py-2.5 hover:bg-red-700 disabled:bg-red-300 transition-colors"
                  >
                    {deleteUserMutation.isPending ? "Deleting…" : "Delete account"}
                  </button>
                  <button
                    onClick={() => setConfirmingDeleteUser(null)}
                    className="w-full sm:w-auto rounded-2xl border border-black/[0.12] text-brand-dark font-semibold px-5 py-2.5 hover:bg-black/[0.02] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
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
