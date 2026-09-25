"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Role } from "@/lib/types";

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "PENDING" | "ACTIVE" | "INACTIVE";
  /** The primary admin: cannot be deactivated or deleted. */
  isRootAdmin?: boolean;
  location?: string | null;
  createdAt: string;
  wallet?: { address: string; index: number; chain: string; derivationPath: string } | null;
};

/**
 * Backend roles are uppercase (ADMIN/OPERATOR); the UI compares lowercase, the
 * same normalisation the auth store does for the signed-in user.
 *
 * Without this every `role === "operator"` test silently failed, so operator
 * counts on the dashboard and hub cards always read zero.
 */
function toUiUser(u: ApiUser): ApiUser {
  return { ...u, role: String(u.role).toLowerCase() as Role };
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () =>
      api.get<{ users: ApiUser[] }>("/api/users").then((r) => r.users.map(toUiUser)),
    // Poll every 15 seconds so operator/admin lists stay live.
    refetchInterval: 15_000,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      email: string;
      role: Role;
      location: string;
    }) =>
      api.post<{ user: ApiUser }>("/api/users", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) =>
      api.patch<{ user: ApiUser }>(`/api/users/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.del<{ deleted: boolean; message: string }>(`/api/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}
