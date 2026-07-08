"use client";

import { useMemo, useState } from "react";
import type { Batch, BatchStage } from "@/lib/types";
import { STAGE_LABEL, STAGE_ORDER } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import BatchList from "./BatchList";
import { SearchIcon } from "@/components/icons";
import { Select } from "@/components/ui/Field";

export default function BatchBrowser({
  batches,
  basePath,
  showOperator = false,
  showLocation = false,
}: {
  batches: Batch[];
  basePath: string;
  showOperator?: boolean;
  showLocation?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<BatchStage | "all">("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  const uniqueLocations = useMemo(() => {
    const locs = new Set<string>();
    batches.forEach((b) => b.location && locs.add(b.location));
    return Array.from(locs).sort();
  }, [batches]);

  const filtered = useMemo(() => {
    return batches.filter((b) => {
      const matchesStage = stage === "all" || b.stage === stage;
      const matchesLocation = selectedLocation === "all" || b.location === selectedLocation;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        b.id.toLowerCase().includes(q) ||
        b.product.toLowerCase().includes(q) ||
        b.source.toLowerCase().includes(q) ||
        b.operator.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q);
      return matchesStage && matchesLocation && matchesQuery;
    });
  }, [batches, query, stage, selectedLocation]);

  const chips: (BatchStage | "all")[] = ["all", ...STAGE_ORDER];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search batch ID, product, source…"
            className="h-12 w-full rounded-2xl border border-black/[0.12] bg-white pl-11 pr-4 text-[15px] text-brand-dark outline-none transition-colors placeholder:text-muted/60 focus:border-brand"
          />
        </div>
        {showLocation && uniqueLocations.length > 0 && (
          <div className="w-full md:w-64">
            <Select
              id="batch-location-filter"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="h-12"
            >
              <option value="all">All Locations</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => setStage(c)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              stage === c
                ? "border-brand-dark bg-brand-dark text-white"
                : "border-black/[0.12] bg-white text-brand-dark/70 hover:bg-mint"
            )}
          >
            {c === "all" ? "All" : STAGE_LABEL[c]}
          </button>
        ))}
      </div>

      <BatchList
        batches={filtered}
        basePath={basePath}
        showOperator={showOperator}
        showLocation={showLocation}
      />
    </div>
  );
}
