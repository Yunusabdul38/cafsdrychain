"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiPayment } from "@/lib/hooks/useBatches";

/** Amounts cross the wire in kobo; operators think in naira. */
export const koboToNaira = (kobo: number) => kobo / 100;

export function formatNaira(kobo: number) {
  return `₦${koboToNaira(kobo).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Set the drying fee and issue the payment link. Amount is in whole naira. */
export function useCreatePayment(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { amount: number }) =>
      api.post<{ payment: ApiPayment }>(`/api/batches/${batchId}/payment`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batch", batchId] });
      qc.invalidateQueries({ queryKey: ["batches"] });
      qc.invalidateQueries({ queryKey: ["payment", batchId] });
    },
  });
}

/**
 * Poll the payment while it is outstanding — the operator is watching the
 * screen waiting for the supplier's transfer to land.
 */
export function usePayment(batchId: string, enabled = true) {
  return useQuery({
    queryKey: ["payment", batchId],
    queryFn: () =>
      api
        .get<{ payment: ApiPayment | null }>(`/api/batches/${batchId}/payment`)
        .then((r) => r.payment),
    enabled: Boolean(batchId) && enabled,
    refetchInterval: (q) => (q.state.data?.status === "PAID" ? false : 8_000),
  });
}

/** Record a batch as free to dry, when the admin has fees switched off. */
export function useWaivePayment(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ payment: ApiPayment }>(`/api/batches/${batchId}/payment/waive`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batch", batchId] });
      qc.invalidateQueries({ queryKey: ["batches"] });
      qc.invalidateQueries({ queryKey: ["payment", batchId] });
    },
  });
}

/**
 * Ask the gateway directly whether this batch's fee has gone through.
 *
 * The webhook normally settles a fee within seconds, but it can lag or be
 * missed entirely — a failed delivery, a redeploy mid-flight — and the polling
 * above only re-reads our own database, so it would spin forever. This is the
 * operator's way out: it asks the gateway and settles on what it reports.
 */
export function useRefreshPayment(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{ payment: ApiPayment }>(`/api/batches/${batchId}/payment/refresh`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment", batchId] });
      qc.invalidateQueries({ queryKey: ["batches"] });
    },
  });
}
