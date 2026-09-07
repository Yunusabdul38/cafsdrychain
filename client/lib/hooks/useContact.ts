"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type ContactInput = {
  name: string;
  email: string;
  organization?: string;
  message: string;
};

/** Public enquiry form on the marketing site — no session required. */
export function useSendContactMessage() {
  return useMutation({
    mutationFn: (input: ContactInput) =>
      api.post<{ ok: true }>("/api/contact", input, { auth: false }),
  });
}
