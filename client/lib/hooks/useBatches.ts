"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type ApiStage =
  | "REGISTERED"
  | "DRYING"
  | "DRIED"
  | "STORED"
  | "IN_TRANSIT"
  | "DELIVERED";

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
  deliveryDate: string;
  dryingStart?: string | null;
  dryingEnd?: string | null;
  quality?: string | null;
  storageLocation?: string | null;
  packaging?: string | null;
  transport?: string | null;
  destination?: string | null;
  stage: ApiStage;
  location: string;
  chainStatus: "PENDING" | "CONFIRMED" | "FAILED";
  txHash?: string | null;
  metadataHash?: string;
  createdAt?: string;
  operator?: { id: string; name: string; location?: string | null };
  events?: {
    stage: ApiStage;
    title: string;
    actor: string;
    createdAt: string;
    txHash?: string | null;
    chainStatus?: string;
  }[];
};

export function useBatches() {
  return useQuery({
    queryKey: ["batches"],
    queryFn: () => api.get<{ batches: ApiBatch[] }>("/api/batches").then((r) => r.batches),
    // Poll every 15 seconds so all hub operators and admins stay in sync.
    refetchInterval: 15_000,
  });
}

export function useBatch(batchId: string) {
  return useQuery({
    queryKey: ["batch", batchId],
    queryFn: () => api.get<{ batch: ApiBatch }>(`/api/batches/${batchId}`).then((r) => r.batch),
    enabled: Boolean(batchId),
    // Poll the detail view too — anyone watching a batch sees live stage changes.
    refetchInterval: 15_000,
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

export type AdvanceBatchInput = {
  expectedStage?: string;
  dryingStart?: string;
  dryingEnd?: string;
  finalWeight?: number;
  moisture?: number;
  quality?: string;
  storageLocation?: string;
  packaging?: string;
  transport?: string;
  destination?: string;
  notes?: string;
};

export function useAdvanceBatch(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdvanceBatchInput) =>
      api.post<{ batch: ApiBatch }>(`/api/batches/${batchId}/advance`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batches"] });
      qc.invalidateQueries({ queryKey: ["batch", batchId] });
    },
  });
}
