import type { Batch } from "./types";
import type { ActivityItem } from "@/components/dashboard/ActivityFeed";

export type Stat = { label: string; value: string; hint: string };

/** Most recent lifecycle events across the given batches. */
export function recentActivity(batches: Batch[], limit = 6): ActivityItem[] {
  return batches
    .flatMap((b) =>
      b.timeline.map((t) => ({
        title: t.title,
        batchId: b.id,
        actor: t.actor,
        timestamp: t.timestamp,
      }))
    )
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, limit);
}

function countEvents(batches: Batch[]): number {
  return batches.reduce((sum, b) => sum + b.timeline.length, 0);
}

export function operatorMetrics(batches: Batch[]): Stat[] {
  const drying = batches.filter((b) => b.stage === "drying").length;
  const inStorage = batches.filter(
    (b) => b.stage === "stored" || b.stage === "in-transit"
  ).length;
  const delivered = batches.filter((b) => b.stage === "delivered").length;
  return [
    { label: "My batches", value: String(batches.length), hint: "assigned" },
    { label: "Drying now", value: String(drying), hint: "needs update" },
    { label: "In storage", value: String(inStorage), hint: "ready to ship" },
    { label: "Delivered", value: String(delivered), hint: "completed" },
  ];
}

export function adminMetrics(batches: Batch[], operatorCount: number): Stat[] {
  const drying = batches.filter((b) => b.stage === "drying").length;
  const hubs = new Set(batches.map((b) => b.location)).size;
  return [
    { label: "Total batches", value: String(batches.length), hint: `across ${hubs || 0} hubs` },
    { label: "Active drying", value: String(drying), hint: "in progress" },
    { label: "Operators", value: String(operatorCount), hint: "active" },
    { label: "On chain records", value: String(countEvents(batches)), hint: "events" },
  ];
}
