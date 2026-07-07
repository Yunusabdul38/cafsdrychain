"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore, normalizeUser, type AuthUser } from "@/lib/store/auth";

function AuthBootstrap() {
  const status = useAuthStore((s) => s.status);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    if (status !== "idle") return;
    let active = true;
    (async () => {
      // Rehydrate a session from the httpOnly refresh cookie.
      const token = await api.refreshAccessToken();
      if (!active) return;
      if (!token) return clear();
      try {
        const { user } = await api.get<{ user: AuthUser }>("/api/auth/me");
        if (active) setAuth(normalizeUser(user), token);
      } catch {
        if (active) clear();
      }
    })();
    return () => {
      active = false;
    };
  }, [status, setAuth, clear]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <AuthBootstrap />
      {children}
    </QueryClientProvider>
  );
}
