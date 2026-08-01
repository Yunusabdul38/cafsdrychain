"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * Displays a pulsing green "Live" badge alongside a relative "last updated"
 * timestamp. Accepts the `dataUpdatedAt` timestamp from a React Query result
 * (e.g. useBatches().dataUpdatedAt).
 */
export function LiveIndicator({
  dataUpdatedAt,
  className,
}: {
  dataUpdatedAt?: number;
  className?: string;
}) {
  const [, forceRender] = useState(0);

  // Re-render every 10 seconds to keep the "X seconds ago" label fresh.
  useEffect(() => {
    const id = setInterval(() => forceRender((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  if (!dataUpdatedAt) return null;

  const secondsAgo = Math.floor((Date.now() - dataUpdatedAt) / 1000);
  const label =
    secondsAgo < 5
      ? "just now"
      : secondsAgo < 60
        ? `${secondsAgo}s ago`
        : `${Math.floor(secondsAgo / 60)}m ago`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700",
        className
      )}
      title={`Data last fetched: ${new Date(dataUpdatedAt).toLocaleTimeString()}`}
    >
      {/* Pulsing dot */}
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      Live · {label}
    </span>
  );
}
