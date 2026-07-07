"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type ApiBatch = {
  id: string;
  batchId: string;
  product: string;
  sourceType: "Farm" | "Market";
  source: string;
  supplier: string;
  freshWeight: number;
  finalWeight?: number | null;
  moisture?: number | null;
  stage: "REGISTERED" | "DRYING" | "DRIED" | "STORED" | "IN_TRANSIT" | "DELIVERED";
  location: string;
  chainStatus: "PENDING" | "CONFIRMED" | "FAILED";
  txHash?: string | null;
  operator?: { id: string; name: string; location?: string | null };
  events?: { stage: string; title: string; actor: string; createdAt: string; txHash?: string | null }[];
};

export function useBatches() {
  return useQuery({
    queryKey: ["batches"],
    queryFn: () => api.get<{ batches: ApiBatch[] }>("/api/batches").then((r) => r.batches),
  });
}

export function useBatch(batchId: string) {
  return useQuery({
    queryKey: ["batch", batchId],
    queryFn: () => api.get<{ batch: ApiBatch }>(`/api/batches/${batchId}`).then((r) => r.batch),
    enabled: Boolean(batchId),
  });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      product: string;
      sourceType: "Farm" | "Market";
      source: string;
      supplier: string;
      freshWeight: number;
      deliveryDate: string;
      location: string;
    }) => api.post<{ batch: ApiBatch }>("/api/batches", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["batches"] }),
  });
}

export function useAdvanceBatch(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      api.post<{ batch: ApiBatch }>(`/api/batches/${batchId}/advance`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batches"] });
      qc.invalidateQueries({ queryKey: ["batch", batchId] });
    },
  });
}
