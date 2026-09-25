"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type ApiLocation = {
  id: string;
  name: string;
  /** Whether this hub charges a drying fee, when fees are on globally. */
  feesEnabled: boolean;
  createdAt: string;
};

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: () => api.get<{ locations: ApiLocation[] }>("/api/locations").then((r) => r.locations),
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; feesEnabled?: boolean }) =>
      api.patch<{ location: ApiLocation }>(`/api/locations/${id}`, body),
    // Write the confirmed row straight into the cache so the hub's switch
    // reflects what the database actually holds, then refetch the rest.
    onSuccess: (res) => {
      qc.setQueryData<ApiLocation[]>(["locations"], (prev) =>
        prev?.map((l) => (l.id === res.location.id ? res.location : l))
      );
      qc.invalidateQueries({ queryKey: ["locations"] });
      // A rename cascades to users and batches server-side, so refresh both.
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["batches"] });
    },
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string }) =>
      api.post<{ location: ApiLocation }>("/api/locations", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });
}
