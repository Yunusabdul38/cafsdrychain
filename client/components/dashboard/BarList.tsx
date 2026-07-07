export type Bar = { label: string; value: number; sub?: string };

export default function BarList({
  bars,
  unit = "",
}: {
  bars: Bar[];
  unit?: string;
}) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <ul className="space-y-4">
      {bars.map((b) => (
        <li key={b.label}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-brand-dark">{b.label}</span>
            <span className="text-muted">
              {b.value}
              {unit} {b.sub && <span className="ml-1">· {b.sub}</span>}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-mint">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.round((b.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
