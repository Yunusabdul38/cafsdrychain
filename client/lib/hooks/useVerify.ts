"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type PublicRecord = {
  batchId: string;
  product: string;
  source: string;
  sourceType: string;
  supplier: string;
  freshWeight: number;
  finalWeight?: number | null;
  moisture?: number | null;
  quality?: string | null;
  stage: string;
  location: string;
  storageLocation?: string | null;
  destination?: string | null;
  deliveryDate: string;
  verified: boolean;
  onChainValid: boolean;
  metadataHash: string;
  txHash?: string | null;
  timeline: { stage: string; title: string; actor: string; timestamp: string; txHash?: string | null }[];
};

export function useVerify(batchId: string) {
  return useQuery({
    queryKey: ["verify", batchId],
    queryFn: () =>
      api.get<{ record: PublicRecord }>(`/api/verify/${batchId}`, { auth: false }).then(
        (r) => r.record
      ),
    enabled: Boolean(batchId),
    retry: false,
  });
}
