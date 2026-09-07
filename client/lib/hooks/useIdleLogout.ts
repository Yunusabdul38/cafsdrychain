"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth";
import { broadcastSignOut } from "@/lib/hooks/useSessionWatch";

/** Matches the server's SESSION_IDLE_MINUTES. */
const IDLE_MS = 60 * 60 * 1000;
/** How long the warning stands before the session actually ends. */
const WARN_BEFORE_MS = 2 * 60 * 1000;

/** Genuine human activity — not background polling, which never stops. */
const ACTIVITY = ["mousedown", "keydown", "touchstart", "scroll", "pointerdown"] as const;

/**
 * Signs a user out after an hour without interaction, but warns first.
 *
 * Being cut off silently is worst mid-task, so the warning arrives two minutes
 * ahead: an operator part-way through a form is told before their work is at
 * risk, rather than discovering it when they submit.
 */
export function useIdleLogout() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const [warning, setWarning] = useState(false);

  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Arms the timers only — no state is touched, so this is safe to call from
  // an effect body without triggering a cascading render.
  const arm = useCallback(() => {
    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (outTimer.current) clearTimeout(outTimer.current);

    warnTimer.current = setTimeout(() => setWarning(true), IDLE_MS - WARN_BEFORE_MS);
    outTimer.current = setTimeout(() => {
      api.post("/api/auth/logout").catch(() => {});
      useAuthStore.getState().clear("timeout");
      broadcastSignOut();
      router.replace("/login?reason=timeout");
    }, IDLE_MS);
  }, [router]);

  /** Activity or an explicit "stay signed in": dismiss and start over. */
  const reset = useCallback(() => {
    setWarning(false);
    arm();
  }, [arm]);

  useEffect(() => {
    if (status !== "authenticated") return;

    arm();
    ACTIVITY.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    return () => {
      if (warnTimer.current) clearTimeout(warnTimer.current);
      if (outTimer.current) clearTimeout(outTimer.current);
      ACTIVITY.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [status, arm, reset]);

  return { warning, staySignedIn: reset };
}
