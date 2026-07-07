export type Stat = { label: string; value: string; hint?: string };

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl border border-black/[0.08] bg-white p-4 sm:p-5"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {s.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-brand-dark sm:text-3xl">
            {s.value}
          </p>
          {s.hint && <p className="mt-1 text-xs text-muted">{s.hint}</p>}
        </div>
      ))}
    </div>
  );
}
