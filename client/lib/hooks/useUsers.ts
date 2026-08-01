"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Role } from "@/lib/types";

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "INACTIVE";
  location?: string | null;
  createdAt: string;
  wallet?: { address: string; index: number; chain: string; derivationPath: string } | null;
};

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<{ users: ApiUser[] }>("/api/users").then((r) => r.users),
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
