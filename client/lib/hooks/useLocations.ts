"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type ApiLocation = {
  id: string;
  name: string;
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
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<{ location: ApiLocation }>(`/api/locations/${id}`, { name }),
    onSuccess: () => {
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
