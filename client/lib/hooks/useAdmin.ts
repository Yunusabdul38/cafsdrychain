"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type RelayerWallet = {
  address: string;
  balance: number;
  symbol: string;
  chainId: number;
  lowThreshold: number;
  criticalThreshold: number;
  status: "HEALTHY" | "LOW" | "CRITICAL";
};

/**
 * The gas wallet behind every on chain write. Polled so an admin sees it
 * draining rather than finding out when operators' records stop confirming.
 */
export function useRelayerWallet() {
  return useQuery({
    queryKey: ["relayer-wallet"],
    queryFn: () =>
      api.get<{ wallet: RelayerWallet | null; chainEnabled: boolean }>("/api/admin/wallet"),
    refetchInterval: 60_000,
    retry: false,
  });
}

export type AppSettings = {
  feesEnabled: boolean;
  /** Minimum chargeable fee, in kobo. */
  minimumFee: number;
};

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<{ settings: AppSettings }>("/api/admin/settings").then((r) => r.settings),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { feesEnabled?: boolean; minimumFee?: number }) =>
      api.patch<{ settings: AppSettings }>("/api/admin/settings", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}
