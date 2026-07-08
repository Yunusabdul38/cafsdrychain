import type { Batch } from "./types";
import type { ApiUser } from "./hooks/useUsers";

export type HubStat = {
  name: string;
  batches: number;
  active: number; // currently drying
  operators: number;
};

/** Derive hub stats from live batches + users (no static location list). */
export function deriveLocations(batches: Batch[], users: ApiUser[]): HubStat[] {
  const names = new Set<string>();
  batches.forEach((b) => b.location && names.add(b.location));
  users.forEach((u) => u.location && names.add(u.location));

  return Array.from(names)
    .map((name) => ({
      name,
      batches: batches.filter((b) => b.location === name).length,
      active: batches.filter((b) => b.location === name && b.stage === "drying").length,
      operators: users.filter((u) => u.location === name && u.role === "operator").length,
    }))
    .sort((a, b) => b.batches - a.batches);
}
