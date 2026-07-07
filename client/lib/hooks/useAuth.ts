"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore, normalizeUser, type AuthUser } from "@/lib/store/auth";

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
    onSettled: () => clear(),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api.post("/api/auth/change-password", input),
  });
}
