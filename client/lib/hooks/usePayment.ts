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

export type PublicPayment = {
  reference: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED";
  provider: string;
  paidAt?: string | null;
  batch: { batchId: string; product: string; location: string };
};

/** Unauthenticated lookup used by the checkout page. */
export function usePublicPayment(reference: string) {
  return useQuery({
    queryKey: ["public-payment", reference],
    queryFn: () =>
      api
        .get<{ payment: PublicPayment }>(`/api/payments/${reference}`, { auth: false })
        .then((r) => r.payment),
    enabled: Boolean(reference),
    retry: false,
  });
}

/** Stub gateway only — stands in for a real webhook while testing. */
export function useSimulatePayment(reference: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { outcome: "PAID" | "FAILED" }) =>
      api.post<{ payment: PublicPayment }>(
        `/api/payments/${reference}/simulate`,
        input,
        { auth: false }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["public-payment", reference] }),
  });
}
