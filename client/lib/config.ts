"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type AppConfig = {
  chainId: number;
  explorerUrl: string | null;
  hideMoisture: boolean;
};

/**
 * Deployment settings, read from the server rather than baked into the build,
 * so they are set in one place and the site can never disagree with the server
 * about which chain it is on. Fetched once per session.
 */
export function useAppConfig() {
  return useQuery({
    queryKey: ["app-config"],
    queryFn: () => api.get<AppConfig>("/api/config", { auth: false }),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
