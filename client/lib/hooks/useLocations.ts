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

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string }) =>
      api.post<{ location: ApiLocation }>("/api/locations", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });
}
