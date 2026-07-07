import PageHeader from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { locations } from "@/lib/mock-data";
import { BuildingIcon } from "@/components/icons";

export default function AdminLocations() {
  return (
    <>
      <PageHeader
        title="Locations"
        description="Solar drying hubs across the network."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((loc) => (
          <Card key={loc.name} className="p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint text-brand">
                <BuildingIcon className="h-5 w-5" />
              </span>
              {loc.batches > 0 ? (
                <Badge className="bg-mint text-brand" dot="bg-brand">
                  Active
                </Badge>
              ) : (
                <Badge className="bg-black/[0.05] text-muted">Idle</Badge>
              )}
            </div>
            <p className="mt-4 font-semibold text-brand-dark">{loc.name}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-lg font-semibold text-brand-dark">
                  {loc.batches}
                </p>
                <p className="text-xs text-muted">Total batches</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-brand-dark">
                  {loc.active}
                </p>
                <p className="text-xs text-muted">Drying now</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs text-muted">
                <span>Capacity used</span>
                <span>{loc.capacity}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-mint">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${loc.capacity}%` }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
