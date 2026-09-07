"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth";

const HEARTBEAT_MS = 45_000;
const CHANNEL = "drychain-auth";

/**
 * Notices a session ending *before* the user invests effort in a form.
 *
 * Two signals:
 *  - a lightweight heartbeat, so a session revoked elsewhere (a sign-out on
 *    another device, a deactivated account, an idle expiry) surfaces within
 *    seconds rather than when a filled-in form is submitted;
 *  - a broadcast between tabs, so signing out in one tab clears the others
 *    immediately instead of after the next network call.
 */
export function useSessionWatch() {
  const status = useAuthStore((s) => s.status);

  // Heartbeat — only while signed in, and paused when the tab is hidden.
  useQuery({
    queryKey: ["session-heartbeat"],
    queryFn: async () => {
      try {
        return await api.get<{ ok: true }>("/api/auth/heartbeat");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          useAuthStore.getState().clear("expired");
        }
        throw err;
      }
    },
    enabled: status === "authenticated",
    refetchInterval: HEARTBEAT_MS,
    refetchIntervalInBackground: false,
    retry: false,
  });

  // Cross-tab: one sign-out ends them all, at once.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (e) => {
      if (e.data === "signed-out" && useAuthStore.getState().status === "authenticated") {
        useAuthStore.getState().clear("expired");
      }
    };
    return () => channel.close();
  }, []);
}

/** Tell every other tab that this browser's session has ended. */
export function broadcastSignOut() {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(CHANNEL);
  channel.postMessage("signed-out");
  channel.close();
}
