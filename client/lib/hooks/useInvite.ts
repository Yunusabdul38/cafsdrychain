"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** Check an invitation link before showing the set-password form. */
export function useVerifyInviteToken(token: string) {
  return useQuery({
    queryKey: ["verify-invite-token", token],
    queryFn: () =>
      api.get<{ valid: boolean; reason?: string }>(
        `/api/auth/verify-invite-token?token=${encodeURIComponent(token)}`,
        { auth: false }
      ),
    enabled: Boolean(token),
    staleTime: Infinity,
    retry: false,
  });
}

/** Set a first password and activate the account. */
export function useAcceptInvite() {
  return useMutation({
    mutationFn: (input: { token: string; password: string }) =>
      api.post<{ ok: true }>("/api/auth/accept-invite", input, { auth: false }),
  });
}

/** Admin: send a fresh invitation, invalidating any earlier link. */
export function useResendInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post<{ ok: true }>(`/api/users/${userId}/invite`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}
