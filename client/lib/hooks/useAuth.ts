"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore, normalizeUser, type AuthUser } from "@/lib/store/auth";
import { broadcastSignOut } from "@/lib/hooks/useSessionWatch";

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const data = await api.post<{ accessToken: string; user: AuthUser }>(
        "/api/auth/login",
        input,
        { auth: false }
      );
      return { accessToken: data.accessToken, user: normalizeUser(data.user) };
    },
    onSuccess: (data) => setAuth(data.user, data.accessToken),
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  return useMutation({
    mutationFn: () => api.post("/api/auth/logout"),
    onSettled: () => {
      clear();
      broadcastSignOut();
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api.post("/api/auth/change-password", input),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: { email: string }) =>
      api.post<{ ok: true }>("/api/auth/forgot-password", input, { auth: false }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: { token: string; newPassword: string }) =>
      api.post<{ ok: true }>("/api/auth/reset-password", input, { auth: false }),
  });
}

export function useVerifyResetToken(token: string) {
  return useQuery({
    queryKey: ["verify-reset-token", token],
    queryFn: () =>
      api.get<{ valid: boolean; reason?: string }>(
        `/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`,
        { auth: false }
      ),
    enabled: Boolean(token),
    staleTime: Infinity,
  });
}
